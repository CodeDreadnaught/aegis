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
    if (hasCompleteInitialReadingValues(row)) {
      errors.push(...validateInitialReadingRow(row));
    } else {
      errors.push(
        `Initial reading is incomplete. Provide ${initialReadingRequiredLabels.join(
          ", "
        )}, or leave all initial-reading columns blank for equipment-only import.`
      );
    }
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
  return initialReadingFields.some((key) => Boolean(row[key]?.trim()));
}

export function hasCompleteInitialReadingValues(row: Record<string, string>) {
  return initialReadingRequiredFields.every((key) => Boolean(row[key]?.trim()));
}

export function normaliseEnumCell(value: string | undefined) {
  return value?.trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function formatZodIssues(error: unknown, label: string) {
  if (error instanceof z.ZodError) {
    return Array.from(new Set(error.issues.map((issue) => {
      const field = issue.path.join(".");

      return field
        ? `${label} ${field}: ${issue.message}`
        : `${label}: ${issue.message}`;
    })));
  }

  return [`Invalid ${label} values.`];
}

const initialReadingRequiredFields = [
  "type",
  "airTemperatureKelvin",
  "processTemperatureKelvin",
  "rotationalSpeedRpm",
  "torqueNm",
  "toolWearMinutes",
];

const initialReadingRequiredLabels = [
  "product type",
  "air temperature",
  "process temperature",
  "rotational speed",
  "torque",
  "tool wear",
];

const initialReadingFields = [
  "recordedAt",
  ...initialReadingRequiredFields,
  "pressureBar",
  "vibrationMmS",
  "flowRateBpd",
  "operatingHours",
];
