import { z } from "zod";

import { equipmentSchema } from "@/features/equipment/validation";
import {
  operationalReadingSchema,
} from "@/features/operational-readings/validation";
import { maintenanceRecordSchema } from "@/features/maintenance/validation";

export function validateEquipmentImportRow(row: Record<string, string>) {
  const errors: string[] = [];

  try {
    equipmentSchema.parse({
      assetTag: row.assetTag,
      name: row.name,
      category: normaliseEnumCell(row.category),
      status: normaliseEnumCell(row.status) ?? "ACTIVE",
      location: row.location,
      manufacturer: row.manufacturer,
      model: row.model,
      serialNumber: row.serialNumber,
      installationDate: row.installationDate,
      description: row.description,
    });
  } catch (error) {
    errors.push(...formatZodIssues(error, "equipment"));
  }

  if (hasInitialReadingValues(row)) {
    errors.push(...validateInitialReadingRow(row));
  }

  return errors;
}

export function validateOperationalReadingImportRow(row: Record<string, string>) {
  return validateInitialReadingRow({
    ...row,
    equipmentId: row.equipmentId || "preview-equipment",
  });
}

export function validateMaintenanceImportRow(row: Record<string, string>) {
  const errors: string[] = [];

  if (!row.equipmentId && !row.assetTag) {
    errors.push("Provide equipmentId or assetTag.");
  }

  try {
    maintenanceRecordSchema.parse({
      equipmentId: row.equipmentId || row.assetTag || "preview-equipment",
      type: row.type,
      description: row.description,
      performedAt: row.performedAt,
      nextDueDate: row.nextDueDate,
      status: normaliseEnumCell(row.status) ?? "COMPLETED",
    });
  } catch (error) {
    errors.push(...formatZodIssues(error, "maintenance"));
  }

  return errors;
}

export function validateInitialReadingRow(row: Record<string, string>) {
  try {
    operationalReadingSchema.parse({
      equipmentId: row.equipmentId || "preview-equipment",
      recordedAt: row.recordedAt || new Date(),
      sourceType: "SENSOR_IMPORT",
      type: row.type || "M",
      airTemperatureKelvin: row.airTemperatureKelvin,
      processTemperatureKelvin: row.processTemperatureKelvin,
      rotationalSpeedRpm: row.rotationalSpeedRpm,
      torqueNm: row.torqueNm,
      toolWearMinutes: row.toolWearMinutes,
      pressureBar: row.pressureBar,
      vibrationMmS: row.vibrationMmS,
      flowRateBpd: row.flowRateBpd,
      operatingHours: row.operatingHours,
    });

    return [];
  } catch (error) {
    return formatZodIssues(error, "reading");
  }
}

export function hasInitialReadingValues(row: Record<string, string>) {
  return [
    "recordedAt",
    "type",
    "airTemperatureKelvin",
    "processTemperatureKelvin",
    "rotationalSpeedRpm",
    "torqueNm",
    "toolWearMinutes",
    "pressureBar",
    "vibrationMmS",
    "flowRateBpd",
    "operatingHours",
  ].some((key) => Boolean(row[key]?.trim()));
}

export function normaliseEnumCell(value: string | undefined) {
  return value?.trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function formatZodIssues(error: unknown, label: string) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => {
      const field = issue.path.join(".");

      return field
        ? `${label} ${field}: ${issue.message}`
        : `${label}: ${issue.message}`;
    });
  }

  return [`Invalid ${label} values.`];
}
