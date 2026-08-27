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

const maxPredictionJobAttempts = 3;

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

  const existingPrediction = await prisma.prediction.findFirst({
    where: { operationalReadingId: readingId },
    select: {
      id: true,
      equipmentId: true,
    },
  });

  if (existingPrediction) {
    await markPredictionJobCompleted(readingId);

    return {
      created: false,
      equipmentId: existingPrediction.equipmentId,
      predictionId: existingPrediction.id,
    };
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

  await markPredictionJobProcessing(readingId);

  const { snapshot, vector } = buildAi4iFeatureVector(reading.parameters);
  const { failureProbability } = await runAegisInference(vector);
  const healthScore = calculateHealthScore(failureProbability);
  const riskLevel = classifyRisk(failureProbability, riskThresholds);
  const persistedRiskLevel = riskLevelMap[riskLevel];
  const abnormalParameters = abnormalAi4iParameters(reading.parameters);
  const recommendation = buildRecommendation({
    riskLevel,
    failureProbability,
    healthScore,
    abnormalParameters,
  });

  const prediction = await prisma.prediction.create({
    data: {
      equipmentId: reading.equipmentId,
      operationalReadingId: reading.id,
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
                equipmentId: reading.equipmentId,
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
      status: { in: ["PENDING", "FAILED"] },
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

async function markPredictionJobProcessing(readingId: string) {
  await prisma.predictionJob.updateMany({
    where: {
      operationalReadingId: readingId,
      status: { in: ["PENDING", "FAILED"] },
    },
    data: {
      attempts: { increment: 1 },
      lastError: null,
      status: "PROCESSING",
    },
  });
}

async function markPredictionJobCompleted(readingId: string) {
  await prisma.predictionJob.updateMany({
    where: { operationalReadingId: readingId },
    data: {
      lastError: null,
      processedAt: new Date(),
      status: "COMPLETED",
    },
  });
}

async function markPredictionJobFailed(readingId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown prediction error";

  await prisma.predictionJob.updateMany({
    where: { operationalReadingId: readingId },
    data: {
      lastError: message.slice(0, 2000),
      status: "FAILED",
    },
  });
}
