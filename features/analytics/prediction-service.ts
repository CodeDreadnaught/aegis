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
import {
  enqueuePredictionJobs,
  getNextPredictionRetryAt,
  maxPredictionJobAttempts,
  stalePredictionProcessingMinutes,
} from "@/features/analytics/prediction-queue";
import { prisma } from "@/server/db/client";
import metadata from "@/models/ai4i/v1/metadata.json";

export {
  enqueuePredictionJobs,
  getNextPredictionRetryAt,
  getPredictionRetryDelayMinutes,
  maxPredictionJobAttempts,
  predictionRetryBackoffMinutes,
  stalePredictionProcessingMinutes,
} from "@/features/analytics/prediction-queue";

const riskLevelMap = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

async function runInference(featureVector: number[]) {
  const { runAegisInference } = await import("@/server/ml/aegis-inference");

  return runAegisInference(featureVector);
}

export async function createPredictionForReading({
  actorId,
  readingId,
}: {
  actorId?: string;
  readingId: string;
}) {
  await enqueuePredictionJobs([readingId]);

  return processPredictionForReading({ actorId, readingId });
}

export async function processPredictionForReading({
  actorId,
  readingId,
}: {
  actorId?: string;
  readingId: string;
}) {
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
  const { failureProbability } = await runInference(vector);
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
      const prediction = await processPredictionForReading({ actorId, readingId });

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
  const now = new Date();
  const jobs = await prisma.predictionJob.findMany({
    where: {
      attempts: { lt: maxPredictionJobAttempts },
      OR: [
        {
          nextRunAt: { lte: now },
          status: { in: ["PENDING", "FAILED"] },
        },
        {
          status: "PROCESSING",
          updatedAt: {
            lte: new Date(
              now.getTime() - stalePredictionProcessingMinutes * 60 * 1000
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
      const prediction = await processPredictionForReading({
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

export async function markPredictionJobFailed(
  readingId: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : "Unknown prediction error";
  const job = await prisma.predictionJob.findUnique({
    where: { operationalReadingId: readingId },
    select: {
      attempts: true,
    },
  });
  const attempts = job?.attempts ?? 0;
  const terminal = attempts >= maxPredictionJobAttempts;
  const nextRunAt = terminal ? new Date() : getNextPredictionRetryAt(attempts);

  await prisma.predictionJob.updateMany({
    where: { operationalReadingId: readingId },
    data: {
      lastError: message.slice(0, 2000),
      nextRunAt,
      status: "FAILED",
    },
  });

  return {
    attempts,
    maxAttempts: maxPredictionJobAttempts,
    message: message.slice(0, 2000),
    nextRunAt,
    terminal,
  };
}