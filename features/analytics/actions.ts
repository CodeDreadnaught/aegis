"use server";

import { revalidatePath } from "next/cache";

import { createPredictionForReading } from "@/features/analytics/prediction-service";
import { requirePermission } from "@/server/auth/session";

export async function runPredictionAction(readingId: string) {
  const actor = await requirePermission("runPrediction");
  const prediction = await createPredictionForReading({
    actorId: actor.id,
    readingId,
  });

  revalidatePath("/analytics");
  revalidatePath("/overview");
  if (prediction.equipmentId) {
    revalidatePath(`/equipment/${prediction.equipmentId}`);
  }
  revalidatePath("/alerts");
  revalidatePath("/reports");
}
