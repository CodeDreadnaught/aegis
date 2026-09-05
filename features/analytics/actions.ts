"use server";

import { revalidatePath } from "next/cache";

import { dispatchPredictionJobsForReadings } from "@/features/analytics/prediction-dispatcher";
import { processPredictionRecoverySweep } from "@/features/analytics/prediction-worker";
import { requirePermission } from "@/server/auth/session";

export async function runPredictionAction(readingId: string) {
  await requirePermission("runPrediction");
  await dispatchPredictionJobsForReadings([readingId]);

  revalidatePredictionPaths();
}

export async function retryPendingPredictionsAction() {
  await requirePermission("runPrediction");
  await processPredictionRecoverySweep({ limit: 50 });

  revalidatePredictionPaths();
}

function revalidatePredictionPaths() {
  revalidatePath("/analytics");
  revalidatePath("/overview");
  revalidatePath("/alerts");
  revalidatePath("/reports");
}