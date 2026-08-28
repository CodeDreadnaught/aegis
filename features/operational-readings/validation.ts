import { z } from "zod";

import type { EquipmentCategory } from "@/generated/prisma/enums";
import {
  getTelemetryRule,
  getTelemetryRules,
  telemetryFieldNames,
  type TelemetryFieldName,
} from "@/features/operational-readings/telemetry-rules";

export const productTypes = ["H", "L", "M"] as const;

export const sourceTypes = ["MANUAL_ENTRY", "SENSOR_IMPORT"] as const;

const optionalNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().finite().optional()
);

export const operationalReadingSchema = z.object({
  equipmentId: z.string().trim().min(1, "Equipment is required."),
  recordedAt: z.coerce.date(),
  sourceType: z.enum(sourceTypes).default("MANUAL_ENTRY"),
  type: z.enum(productTypes),
  airTemperatureKelvin: optionalNumber,
  processTemperatureKelvin: optionalNumber,
  rotationalSpeedRpm: optionalNumber,
  torqueNm: optionalNumber,
  toolWearMinutes: optionalNumber,
  pressureBar: optionalNumber,
  vibrationMmS: optionalNumber,
  flowRateBpd: optionalNumber,
  operatingHours: optionalNumber,
});

export type OperationalReadingInput = z.infer<
  typeof operationalReadingSchema
> & {
  airTemperatureKelvin: number;
  processTemperatureKelvin: number;
  toolWearMinutes: number;
};

type OperationalReadingRowsFormData = {
  getAll(name: string): unknown[];
};

type CategoryLookup = Map<string, EquipmentCategory> | Record<string, EquipmentCategory>;

export function parseOperationalReadingForCategory(
  category: EquipmentCategory,
  values: Record<string, unknown>
): OperationalReadingInput {
  const parsed = operationalReadingSchema.parse(values);
  const issues: z.ZodIssue[] = [];
  const normalized: Record<string, unknown> = { ...parsed };

  for (const field of telemetryFieldNames) {
    const rule = getTelemetryRule(category, field);
    const value = parsed[field];

    if (value === undefined) {
      if (rule.applicability.startsWith("REQUIRED")) {
        issues.push(customIssue(field, `${rule.label} is required for ${formatCategory(category)} readings.`));
      } else if (rule.applicability === "NOT_APPLICABLE" && rule.modelDefault !== undefined) {
        normalized[field] = rule.modelDefault;
      }

      continue;
    }

    if (value < 0) {
      issues.push(customIssue(field, `${rule.label} cannot be negative.`));
      continue;
    }

    if (rule.applicability === "REQUIRED_POSITIVE" && value <= 0) {
      issues.push(customIssue(field, `${rule.label} must be greater than 0 for ${formatCategory(category)} readings.`));
      continue;
    }

    if (rule.applicability === "NOT_APPLICABLE" && value !== 0) {
      issues.push(customIssue(field, `${rule.label} is not applicable for ${formatCategory(category)} readings; leave it blank or use 0.`));
      continue;
    }

    if (rule.min !== undefined && value < rule.min) {
      issues.push(customIssue(field, `${rule.label} must be at least ${rule.min}.`));
    }

    if (rule.max !== undefined && value > rule.max) {
      issues.push(customIssue(field, `${rule.label} must be at most ${rule.max}.`));
    }
  }

  if (issues.length) {
    throw new z.ZodError(issues);
  }

  return normalized as OperationalReadingInput;
}

export function parseOperationalReadingRows(
  formData: OperationalReadingRowsFormData,
  categoriesByEquipmentId: CategoryLookup
) {
  const equipmentIds = formData.getAll("equipmentId");

  return equipmentIds.map((_, index) => {
    const equipmentId = String(formData.getAll("equipmentId")[index] ?? "").trim();
    const category = getCategoryForEquipment(categoriesByEquipmentId, equipmentId);

    if (!category) {
      throw new Error("Select a valid equipment item for each reading.");
    }

    return parseOperationalReadingForCategory(category, {
      equipmentId,
      recordedAt: formData.getAll("recordedAt")[index],
      sourceType: "MANUAL_ENTRY",
      type: formData.getAll("type")[index],
      airTemperatureKelvin: formData.getAll("airTemperatureKelvin")[index],
      processTemperatureKelvin: formData.getAll("processTemperatureKelvin")[index],
      rotationalSpeedRpm: formData.getAll("rotationalSpeedRpm")[index],
      torqueNm: formData.getAll("torqueNm")[index],
      toolWearMinutes: formData.getAll("toolWearMinutes")[index],
      pressureBar: formData.getAll("pressureBar")[index],
      vibrationMmS: formData.getAll("vibrationMmS")[index],
      flowRateBpd: formData.getAll("flowRateBpd")[index],
      operatingHours: formData.getAll("operatingHours")[index],
    });
  });
}

export function buildReadingParameters(input: OperationalReadingInput) {
  return Object.fromEntries(
    Object.entries({
      type: input.type,
      airTemperatureKelvin: input.airTemperatureKelvin,
      processTemperatureKelvin: input.processTemperatureKelvin,
      rotationalSpeedRpm: input.rotationalSpeedRpm,
      torqueNm: input.torqueNm,
      toolWearMinutes: input.toolWearMinutes,
      pressureBar: input.pressureBar,
      vibrationMmS: input.vibrationMmS,
      flowRateBpd: input.flowRateBpd,
      operatingHours: input.operatingHours,
    }).filter(([, value]) => value !== undefined)
  );
}

export function validateOperationalReadingPreview(row: Record<string, string>) {
  const errors: string[] = [];

  try {
    operationalReadingSchema.parse({
      equipmentId: row.equipmentId || row.assetTag || "preview-equipment",
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
  } catch (error) {
    errors.push(...formatZodIssues(error, "reading"));
  }

  for (const field of telemetryFieldNames) {
    const value = row[field];
    const rule = getTelemetryRules("PUMP")[field];
    const requiredForPreview = [
      "airTemperatureKelvin",
      "processTemperatureKelvin",
      "toolWearMinutes",
    ].includes(field);

    if (value === undefined || value.trim() === "") {
      if (requiredForPreview) {
        errors.push(`${rule.label} is required.`);
      }
      continue;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      continue;
    }

    if (numericValue < 0) {
      errors.push(`${rule.label} cannot be negative.`);
      continue;
    }

    if (rule.min !== undefined && numericValue < rule.min) {
      errors.push(`${rule.label} must be at least ${rule.min}.`);
    }

    if (rule.max !== undefined && numericValue > rule.max) {
      errors.push(`${rule.label} must be at most ${rule.max}.`);
    }
  }

  return Array.from(new Set(errors));
}

export function formatOperationalReadingValidationError(error: unknown) {
  if (error instanceof z.ZodError) {
    return Array.from(new Set(error.issues.map((issue) => issue.message))).join(" ");
  }

  return error instanceof Error ? error.message : "Invalid reading values.";
}
export function formatSourceType(sourceType: string) {
  return sourceType
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function getCategoryForEquipment(
  categoriesByEquipmentId: CategoryLookup,
  equipmentId: string
) {
  return categoriesByEquipmentId instanceof Map
    ? categoriesByEquipmentId.get(equipmentId)
    : categoriesByEquipmentId[equipmentId];
}

function customIssue(field: TelemetryFieldName, message: string): z.ZodIssue {
  return {
    code: z.ZodIssueCode.custom,
    message,
    path: [field],
  };
}

function formatCategory(category: EquipmentCategory) {
  return category
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function formatZodIssues(error: unknown, label: string) {
  if (error instanceof z.ZodError) {
    return Array.from(
      new Set(
        error.issues.map((issue) => {
          const field = issue.path.join(".");

          return field
            ? `${label} ${field}: ${issue.message}`
            : `${label}: ${issue.message}`;
        })
      )
    );
  }

  return [`Invalid ${label} values.`];
}