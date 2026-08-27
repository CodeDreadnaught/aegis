import "server-only";

import {
  abnormalAi4iParameters,
  buildAi4iFeatureVector,
} from "@/features/analytics/features";
import {
  buildRecommendation,
  calculateHealthScore,
  classifyRisk,
} from "@/features/analytics/domain/risk";
import { riskThresholds } from "@/features/analytics/domain/thresholds";
import { prisma } from "@/server/db/client";
import { runAegisInference } from "@/server/ml/aegis-inference";
import metadata from "@/models/ai4i/v1/metadata.json";

export const maxPredictionJobAttempts = 3;
export const predictionRetryBackoffMinutes = [5, 30, 120] as const;
export const stalePredictionProcessingMinutes = 15;

const riskLevelMap = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

export async function enqueuePredictionJobs(readingIds: string[]) {
  if (!readingIds.length) {
    return;
  }

  await prisma.predictionJob.createMany({
    data: readingIds.map((readingId) => ({
      operationalReadingId: readingId,
      status: "PENDING",
    })),
    skipDuplicates: true,
  });
}

export async function createPredictionForReading({
  actorId,
  readingId,
}: {
  actorId?: string;
  readingId: string;
}) {
  await enqueuePredictionJobs([readingId]);

  const claimed = await claimPredictionJob(readingId);

  if (!claimed) {
    const existingPrediction = await getExistingPrediction(readingId);

    if (existingPrediction) {
      await markPredictionJobCompleted(readingId);

      return {
        created: false,
        equipmentId: existingPrediction.equipmentId,
        predictionId: existingPrediction.id,
      };
    }

    return {
      created: false,
      equipmentId: null,
      predictionId: null,
    };
  }

  const { snapshot, vector } = buildAi4iFeatureVector(claimed.parameters);
  const { failureProbability } = await runAegisInference(vector);
  const healthScore = calculateHealthScore(failureProbability);
  const riskLevel = classifyRisk(failureProbability, riskThresholds);
  const persistedRiskLevel = riskLevelMap[riskLevel];
  const abnormalParameters = abnormalAi4iParameters(claimed.parameters);
  const recommendation = buildRecommendation({
    riskLevel,
    failureProbability,
    healthScore,
    abnormalParameters,
  });

  const prediction = await prisma.prediction.create({
    data: {
      equipmentId: claimed.equipmentId,
      operationalReadingId: claimed.id,
      failureProbability,
      healthScore,
      riskLevel: persistedRiskLevel,
      modelVersion: metadata.model_version,
      thresholdVersion: riskThresholds.version,
      featureSnapshot: snapshot,
      createdById: actorId,
      recommendations: {
        create: {
          message: recommendation,
          priority: persistedRiskLevel,
          explanationFactors: {
            abnormalParameters,
          },
        },
      },
      alerts:
        persistedRiskLevel === "HIGH"
          ? {
              create: {
                equipmentId: claimed.equipmentId,
                type: "PREDICTION_RISK",
                severity: "HIGH",
                message: recommendation,
              },
            }
          : undefined,
    },
    select: {
      id: true,
      equipmentId: true,
      riskLevel: true,
      failureProbability: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: "RUN_PREDICTION",
      entityType: "Prediction",
      entityId: prediction.id,
      metadata: {
        equipmentId: prediction.equipmentId,
        riskLevel: prediction.riskLevel,
        failureProbability: Number(prediction.failureProbability),
        modelVersion: metadata.model_version,
        source: "AUTOMATED_READING_INGESTION",
      },
    },
  });

  await markPredictionJobCompleted(readingId);

  return {
    created: true,
    equipmentId: prediction.equipmentId,
    predictionId: prediction.id,
  };
}

export async function createPredictionsForReadings({
  actorId,
  readingIds,
}: {
  actorId?: string;
  readingIds: string[];
}) {
  await enqueuePredictionJobs(readingIds);

  const results = {
    created: 0,
    failed: 0,
    skipped: 0,
  };

  for (const readingId of readingIds) {
    try {
      const prediction = await createPredictionForReading({ actorId, readingId });

      if (prediction.created) {
        results.created += 1;
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.failed += 1;
      await markPredictionJobFailed(readingId, error);
      console.error("AEGIS automated prediction failed", {
        error,
        readingId,
      });
    }
  }

  return results;
}

export async function processPendingPredictionJobs({
  actorId,
  limit = 10,
}: {
  actorId?: string;
  limit?: number;
} = {}) {
  await enqueueMissingPredictionJobs(limit);

  const jobs = await prisma.predictionJob.findMany({
    where: {
      attempts: { lt: maxPredictionJobAttempts },
      OR: [
        {
          nextRunAt: { lte: new Date() },
          status: { in: ["PENDING", "FAILED"] },
        },
        {
          status: "PROCESSING",
          updatedAt: {
            lte: new Date(
              Date.now() - stalePredictionProcessingMinutes * 60 * 1000
            ),
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      operationalReadingId: true,
    },
  });

  const results = {
    completed: 0,
    failed: 0,
    skipped: 0,
    total: jobs.length,
  };

  for (const job of jobs) {
    try {
      const prediction = await createPredictionForReading({
        actorId,
        readingId: job.operationalReadingId,
      });

      if (prediction.created) {
        results.completed += 1;
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.failed += 1;
      await markPredictionJobFailed(job.operationalReadingId, error);
      console.error("AEGIS prediction job failed", {
        error,
        jobId: job.id,
        readingId: job.operationalReadingId,
      });
    }
  }

  return results;
}

async function enqueueMissingPredictionJobs(limit: number) {
  const readings = await prisma.operationalReading.findMany({
    where: {
      predictionJob: null,
      predictions: {
        none: {},
      },
    },
    orderBy: { recordedAt: "asc" },
    take: limit,
    select: {
      id: true,
    },
  });

  await enqueuePredictionJobs(readings.map((reading) => reading.id));
}

async function claimPredictionJob(readingId: string) {
  const job = await prisma.predictionJob.findUnique({
    where: { operationalReadingId: readingId },
    select: {
      attempts: true,
      status: true,
    },
  });

  if (!job || job.status === "COMPLETED") {
    return null;
  }

  const claim = await prisma.predictionJob.updateMany({
    where: {
      attempts: { lt: maxPredictionJobAttempts },
      operationalReadingId: readingId,
      OR: [
        {
          nextRunAt: { lte: new Date() },
          status: { in: ["PENDING", "FAILED"] },
        },
        {
          status: "PROCESSING",
          updatedAt: {
            lte: new Date(
              Date.now() - stalePredictionProcessingMinutes * 60 * 1000
            ),
          },
        },
      ],
    },
    data: {
      attempts: { increment: 1 },
      lastError: null,
      status: "PROCESSING",
    },
  });

  if (claim.count !== 1) {
    return null;
  }

  const existingPrediction = await getExistingPrediction(readingId);

  if (existingPrediction) {
    await markPredictionJobCompleted(readingId);
    return null;
  }

  const reading = await prisma.operationalReading.findUnique({
    where: { id: readingId },
    select: {
      id: true,
      equipmentId: true,
      parameters: true,
    },
  });

  if (!reading) {
    throw new Error("Operational reading was not found.");
  }

  return reading;
}

async function getExistingPrediction(readingId: string) {
  return prisma.prediction.findUnique({
    where: { operationalReadingId: readingId },
    select: {
      id: true,
      equipmentId: true,
    },
  });
}

async function markPredictionJobCompleted(readingId: string) {
  await prisma.predictionJob.updateMany({
    where: { operationalReadingId: readingId },
    data: {
      lastError: null,
      nextRunAt: new Date(),
      processedAt: new Date(),
      status: "COMPLETED",
    },
  });
}

async function markPredictionJobFailed(readingId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown prediction error";
  const job = await prisma.predictionJob.findUnique({
    where: { operationalReadingId: readingId },
    select: {
      attempts: true,
    },
  });
  const attempts = job?.attempts ?? 0;
  const nextRunAt = getNextPredictionRetryAt(attempts);

  await prisma.predictionJob.updateMany({
    where: { operationalReadingId: readingId },
    data: {
      lastError: message.slice(0, 2000),
      nextRunAt,
      status: "FAILED",
    },
  });
}

export function getPredictionRetryDelayMinutes(attempts: number) {
  const backoffIndex = Math.min(
    Math.max(0, attempts - 1),
    predictionRetryBackoffMinutes.length - 1
  );

  return predictionRetryBackoffMinutes[backoffIndex];
}

export function getNextPredictionRetryAt(attempts: number, from = new Date()) {
  return new Date(
    from.getTime() + getPredictionRetryDelayMinutes(attempts) * 60 * 1000
  );
}
