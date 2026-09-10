import "server-only";

import { send, type VercelRegion } from "@vercel/queue";

import { PredictionJobStatus } from "@/generated/prisma/enums";
import {
  enqueuePredictionJobs,
  maxPredictionJobAttempts,
} from "@/features/analytics/prediction-queue";
import { prisma } from "@/server/db/client";

export const predictionQueueTopic = "aegis-predictions";
export const predictionQueueRetentionSeconds = 60 * 60 * 24 * 7;
const defaultPredictionQueueRegion = "iad1" satisfies VercelRegion;

type PredictionDispatchJob = {
  attempts: number;
  nextRunAt: Date;
  operationalReadingId: string;
  status: PredictionJobStatus;
};

export type PredictionQueueMessage = {
  readingId: string;
};

export type PredictionDispatchResult = {
  dispatched: number;
  failed: number;
  skipped: number;
  total: number;
};

type DispatchOptions = {
  dueOnly?: boolean;
  now?: Date;
};

export async function dispatchPredictionJobsForReadings(
  readingIds: string[],
  options: DispatchOptions = {}
) {
  const uniqueReadingIds = Array.from(new Set(readingIds.filter(Boolean)));

  if (!uniqueReadingIds.length) {
    return emptyDispatchResult();
  }

  await enqueuePredictionJobs(uniqueReadingIds);

  const jobs = await prisma.predictionJob.findMany({
    where: {
      operationalReadingId: {
        in: uniqueReadingIds,
      },
    },
    select: {
      attempts: true,
      nextRunAt: true,
      operationalReadingId: true,
      status: true,
    },
  });

  return dispatchPredictionJobRecords(jobs, options);
}

export async function dispatchLatestPredictionJobsForEquipment(
  equipmentIds: string[],
  options: DispatchOptions = {}
) {
  const uniqueEquipmentIds = Array.from(new Set(equipmentIds.filter(Boolean)));

  if (!uniqueEquipmentIds.length) {
    return emptyDispatchResult();
  }

  const latestGroups = await prisma.operationalReading.groupBy({
    by: ["equipmentId"],
    where: {
      equipmentId: {
        in: uniqueEquipmentIds,
      },
      predictionEligible: true,
    },
    _max: {
      recordedAt: true,
    },
  });
  const latestConditions = latestGroups
    .filter((group) => group._max.recordedAt)
    .map((group) => ({
      equipmentId: group.equipmentId,
      recordedAt: group._max.recordedAt as Date,
    }));

  if (!latestConditions.length) {
    return emptyDispatchResult();
  }

  const readings = await prisma.operationalReading.findMany({
    where: {
      OR: latestConditions,
    },
    select: {
      id: true,
      predictions: {
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });
  const missingPredictionReadingIds = readings
    .filter((reading) => !reading.predictions.length)
    .map((reading) => reading.id);

  return dispatchPredictionJobsForReadings(missingPredictionReadingIds, options);
}

export async function dispatchPredictionJobRecords(
  jobs: PredictionDispatchJob[],
  options: DispatchOptions = {}
): Promise<PredictionDispatchResult> {
  const now = options.now ?? new Date();
  const result = {
    dispatched: 0,
    failed: 0,
    skipped: 0,
    total: jobs.length,
  };

  for (const job of jobs) {
    const eligibility = getPredictionJobDispatchEligibility(job, now);

    if (!eligibility.eligible || (options.dueOnly && eligibility.delaySeconds > 0)) {
      result.skipped += 1;
      continue;
    }

    try {
      await send<PredictionQueueMessage>(
        predictionQueueTopic,
        { readingId: job.operationalReadingId },
        {
          delaySeconds: eligibility.delaySeconds,
          idempotencyKey: buildPredictionQueueIdempotencyKey(job),
          retentionSeconds: predictionQueueRetentionSeconds,
          region: getPredictionQueueRegion(),
        }
      );
      result.dispatched += 1;
    } catch (error) {
      result.failed += 1;
      console.error("AEGIS prediction queue publish failed", {
        error,
        readingId: job.operationalReadingId,
      });
    }
  }

  return result;
}

export function buildPredictionQueueIdempotencyKey(
  job: Pick<PredictionDispatchJob, "attempts" | "nextRunAt" | "operationalReadingId">
) {
  return [
    "prediction",
    job.operationalReadingId,
    job.attempts,
    job.nextRunAt.getTime(),
  ].join(":");
}

function getPredictionJobDispatchEligibility(
  job: PredictionDispatchJob,
  now: Date
) {
  if (
    job.status === PredictionJobStatus.COMPLETED ||
    job.status === PredictionJobStatus.PROCESSING ||
    job.attempts >= maxPredictionJobAttempts
  ) {
    return {
      delaySeconds: 0,
      eligible: false,
    };
  }

  const delaySeconds = Math.max(
    0,
    Math.ceil((job.nextRunAt.getTime() - now.getTime()) / 1000)
  );

  return {
    delaySeconds: Math.min(delaySeconds, predictionQueueRetentionSeconds),
    eligible:
      job.status === PredictionJobStatus.PENDING ||
      job.status === PredictionJobStatus.FAILED,
  };
}

function getPredictionQueueRegion(): VercelRegion {
  return (process.env.VERCEL_REGION as VercelRegion | undefined) ?? defaultPredictionQueueRegion;
}

function emptyDispatchResult(): PredictionDispatchResult {
  return {
    dispatched: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
}

