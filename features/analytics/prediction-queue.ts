import "server-only";

import { prisma } from "@/server/db/client";

export const maxPredictionJobAttempts = 3;
export const predictionRetryBackoffMinutes = [5, 30, 120] as const;
export const stalePredictionProcessingMinutes = 15;

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