import "server-only";

import { dispatchPredictionJobRecords } from "@/features/analytics/prediction-dispatcher";
import { maxPredictionJobAttempts } from "@/features/analytics/prediction-queue";
import { prisma } from "@/server/db/client";

const defaultPredictionJobLimit = 10;
const maxPredictionJobLimit = 50;
const stalePredictionProcessingMinutes = 15;

export function normalisePredictionJobLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultPredictionJobLimit;
  }

  return Math.min(maxPredictionJobLimit, Math.max(1, Math.floor(value)));
}

export async function processPredictionRecoverySweep({
  limit = defaultPredictionJobLimit,
}: {
  actorId?: string;
  limit?: number;
} = {}) {
  const boundedLimit = normalisePredictionJobLimit(limit);
  const now = new Date();
  const staleProcessingCutoff = new Date(
    now.getTime() - stalePredictionProcessingMinutes * 60 * 1000
  );

  const repaired = await prisma.predictionJob.updateMany({
    where: {
      status: {
        not: "COMPLETED",
      },
      operationalReading: {
        predictions: {
          some: {},
        },
      },
    },
    data: {
      lastError: null,
      nextRunAt: now,
      processedAt: now,
      status: "COMPLETED",
    },
  });

  const stale = await prisma.predictionJob.updateMany({
    where: {
      attempts: {
        lt: maxPredictionJobAttempts,
      },
      status: "PROCESSING",
      updatedAt: {
        lte: staleProcessingCutoff,
      },
    },
    data: {
      lastError: "Prediction processing was interrupted before completion.",
      nextRunAt: now,
      status: "FAILED",
    },
  });

  const jobs = await prisma.predictionJob.findMany({
    where: {
      attempts: {
        lt: maxPredictionJobAttempts,
      },
      nextRunAt: {
        lte: now,
      },
      status: {
        in: ["PENDING", "FAILED"],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: boundedLimit,
    select: {
      attempts: true,
      nextRunAt: true,
      operationalReadingId: true,
      status: true,
    },
  });
  const dispatch = await dispatchPredictionJobRecords(jobs, {
    dueOnly: true,
    now,
  });

  return {
    ...dispatch,
    repaired: repaired.count,
    stale: stale.count,
  };
}