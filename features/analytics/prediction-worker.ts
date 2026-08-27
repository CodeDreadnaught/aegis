import "server-only";

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
  actorId,
  limit = defaultPredictionJobLimit,
}: {
  actorId?: string;
  limit?: number;
} = {}) {
  const boundedLimit = normalisePredictionJobLimit(limit);
  const hasWork = await hasEligiblePredictionWork();

  if (!hasWork) {
    return {
      completed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
  }

  const { processPendingPredictionJobs } = await import(
    "@/features/analytics/prediction-service"
  );

  return processPendingPredictionJobs({
    actorId,
    limit: boundedLimit,
  });
}

async function hasEligiblePredictionWork() {
  const now = new Date();
  const staleProcessingCutoff = new Date(
    now.getTime() - stalePredictionProcessingMinutes * 60 * 1000
  );
  const [job, readingWithoutJob] = await Promise.all([
    prisma.predictionJob.findFirst({
      where: {
        attempts: { lt: 3 },
        OR: [
          {
            nextRunAt: { lte: now },
            status: { in: ["PENDING", "FAILED"] },
          },
          {
            status: "PROCESSING",
            updatedAt: { lte: staleProcessingCutoff },
          },
        ],
      },
      select: {
        id: true,
      },
    }),
    prisma.operationalReading.findFirst({
      where: {
        predictionJob: null,
        predictions: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  return Boolean(job || readingWithoutJob);
}
