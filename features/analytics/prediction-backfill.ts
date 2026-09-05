import "server-only";

import { PredictionJobStatus } from "@/generated/prisma/enums";
import {
  maxPredictionJobAttempts,
  stalePredictionProcessingMinutes,
} from "@/features/analytics/prediction-queue";
import {
  createPredictionForReading,
  markPredictionJobFailed,
} from "@/features/analytics/prediction-service";
import { prisma } from "@/server/db/client";

export type PredictionBackfillCandidate = {
  equipmentId: string;
  id: string;
  recordedAt: Date;
};

export type PredictionBackfillCandidateOptions = {
  now?: Date;
  take: number;
};

export async function countPredictionBackfillCandidates(now = new Date()) {
  return prisma.operationalReading.count({
    where: buildPredictionBackfillWhere(now),
  });
}

export async function findPredictionBackfillCandidates({
  now = new Date(),
  take,
}: PredictionBackfillCandidateOptions) {
  return prisma.operationalReading.findMany({
    where: buildPredictionBackfillWhere(now),
    orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    take,
    select: {
      equipmentId: true,
      id: true,
      recordedAt: true,
    },
  });
}

export async function processPredictionBackfillReading(readingId: string) {
  try {
    const prediction = await createPredictionForReading({ readingId });

    return prediction.created
      ? ({ status: "completed" as const })
      : ({ status: "skipped" as const });
  } catch (error) {
    const failure = await markPredictionJobFailed(readingId, error);

    return {
      failure,
      status: "failed" as const,
    };
  }
}

function buildPredictionBackfillWhere(now: Date) {
  const staleProcessingCutoff = new Date(
    now.getTime() - stalePredictionProcessingMinutes * 60 * 1000
  );

  return {
    predictionEligible: true,
    predictions: {
      none: {},
    },
    OR: [
      {
        predictionJob: null,
      },
      {
        predictionJob: {
          is: {
            attempts: {
              lt: maxPredictionJobAttempts,
            },
            nextRunAt: {
              lte: now,
            },
            status: {
              in: [PredictionJobStatus.PENDING, PredictionJobStatus.FAILED],
            },
          },
        },
      },
      {
        predictionJob: {
          is: {
            attempts: {
              lt: maxPredictionJobAttempts,
            },
            status: PredictionJobStatus.PROCESSING,
            updatedAt: {
              lte: staleProcessingCutoff,
            },
          },
        },
      },
    ],
  };
}