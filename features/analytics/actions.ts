"use server";

import { revalidatePath } from "next/cache";

import { enqueuePredictionJobs } from "@/features/analytics/prediction-queue";
import { requirePermission } from "@/server/auth/session";

export async function runPredictionAction(readingId: string) {
  await requirePermission("runPrediction");
  await enqueuePredictionJobs([readingId]);

  revalidatePath("/analytics");
  revalidatePath("/overview");
  revalidatePath("/alerts");
  revalidatePath("/reports");
}
