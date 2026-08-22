"use server";

import { revalidatePath } from "next/cache";

import {
  buildReadingParameters,
  operationalReadingSchema,
} from "@/features/operational-readings/validation";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

function parseReadingForm(formData: FormData) {
  return operationalReadingSchema.parse({
    equipmentId: formData.get("equipmentId"),
    recordedAt: formData.get("recordedAt"),
    sourceType: formData.get("sourceType") || "MANUAL_ENTRY",
    type: formData.get("type"),
    airTemperatureKelvin: formData.get("airTemperatureKelvin"),
    processTemperatureKelvin: formData.get("processTemperatureKelvin"),
    rotationalSpeedRpm: formData.get("rotationalSpeedRpm"),
    torqueNm: formData.get("torqueNm"),
    toolWearMinutes: formData.get("toolWearMinutes"),
    pressureBar: formData.get("pressureBar"),
    vibrationMmS: formData.get("vibrationMmS"),
    flowRateBpd: formData.get("flowRateBpd"),
    operatingHours: formData.get("operatingHours"),
  });
}

export async function createOperationalReadingAction(formData: FormData) {
  const actor = await requirePermission("recordOperationalData");
  const input = parseReadingForm(formData);

  const reading = await prisma.operationalReading.create({
    data: {
      equipmentId: input.equipmentId,
      recordedAt: input.recordedAt,
      sourceType: input.sourceType,
      createdById: actor.id,
      parameters: buildReadingParameters(input),
    },
    select: {
      id: true,
      equipmentId: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "CREATE_OPERATIONAL_READING",
      entityType: "OperationalReading",
      entityId: reading.id,
      metadata: {
        equipmentId: reading.equipmentId,
        sourceType: input.sourceType,
      },
    },
  });

  revalidatePath("/operational-data");
  revalidatePath(`/equipment/${reading.equipmentId}`);
}
