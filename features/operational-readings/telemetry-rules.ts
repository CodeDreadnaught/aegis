import type { EquipmentCategory } from "@/generated/prisma/enums";

export const telemetryFieldNames = [
  "airTemperatureKelvin",
  "processTemperatureKelvin",
  "rotationalSpeedRpm",
  "torqueNm",
  "toolWearMinutes",
  "pressureBar",
  "vibrationMmS",
  "flowRateBpd",
  "operatingHours",
] as const;

export type TelemetryFieldName = (typeof telemetryFieldNames)[number];

export type TelemetryApplicability =
  | "REQUIRED_POSITIVE"
  | "REQUIRED_NON_NEGATIVE"
  | "OPTIONAL"
  | "NOT_APPLICABLE";

export type TelemetryRule = {
  applicability: TelemetryApplicability;
  label: string;
  max?: number;
  min?: number;
  modelDefault?: number;
};

type TelemetryRuleMap = Record<TelemetryFieldName, TelemetryRule>;

const baseRules = {
  airTemperatureKelvin: requiredPositive("Air temperature", { min: 250, max: 400 }),
  processTemperatureKelvin: requiredPositive("Process temperature", {
    min: 250,
    max: 450,
  }),
  rotationalSpeedRpm: optional("Rotational speed", { max: 100000 }),
  torqueNm: optional("Torque", { max: 10000 }),
  toolWearMinutes: requiredNonNegative("Tool wear", { max: 100000 }),
  pressureBar: optional("Pressure"),
  vibrationMmS: optional("Vibration"),
  flowRateBpd: optional("Flow rate"),
  operatingHours: optional("Operating hours"),
} satisfies TelemetryRuleMap;

const rotatingMachineRules = {
  ...baseRules,
  rotationalSpeedRpm: requiredPositive("Rotational speed", { max: 100000 }),
  torqueNm: requiredPositive("Torque", { max: 10000 }),
} satisfies TelemetryRuleMap;

const staticProcessRules = {
  ...baseRules,
  rotationalSpeedRpm: notApplicable("Rotational speed", 0),
  torqueNm: notApplicable("Torque", 0),
} satisfies TelemetryRuleMap;

export const telemetryRulesByCategory = {
  PUMP: rotatingMachineRules,
  COMPRESSOR: rotatingMachineRules,
  GENERATOR: {
    ...rotatingMachineRules,
    pressureBar: optional("Pressure"),
    flowRateBpd: notApplicable("Flow rate"),
  },
  WELLHEAD: staticProcessRules,
  CHRISTMAS_TREE: staticProcessRules,
  SEPARATOR: staticProcessRules,
  HEAT_EXCHANGER: staticProcessRules,
  PIPELINE: staticProcessRules,
  STORAGE_TANK: staticProcessRules,
  PRODUCTION_VALVE: {
    ...baseRules,
    rotationalSpeedRpm: notApplicable("Rotational speed", 0),
    torqueNm: optional("Torque", { max: 10000 }),
  },
} satisfies Record<EquipmentCategory, TelemetryRuleMap>;

export function getTelemetryRules(category: EquipmentCategory) {
  return telemetryRulesByCategory[category];
}

export function getTelemetryRule(
  category: EquipmentCategory,
  field: TelemetryFieldName
) {
  return getTelemetryRules(category)[field];
}

export function isTelemetryFieldApplicable(
  category: EquipmentCategory,
  field: TelemetryFieldName
) {
  return getTelemetryRule(category, field).applicability !== "NOT_APPLICABLE";
}

export function getRequiredTelemetryFields(category: EquipmentCategory) {
  return telemetryFieldNames.filter((field) =>
    getTelemetryRule(category, field).applicability.startsWith("REQUIRED")
  );
}

export function formatTelemetryFieldLabel(field: TelemetryFieldName) {
  return baseRules[field].label;
}

function requiredPositive(
  label: string,
  constraints: Omit<TelemetryRule, "applicability" | "label"> = {}
): TelemetryRule {
  return { applicability: "REQUIRED_POSITIVE", label, ...constraints };
}

function requiredNonNegative(
  label: string,
  constraints: Omit<TelemetryRule, "applicability" | "label"> = {}
): TelemetryRule {
  return { applicability: "REQUIRED_NON_NEGATIVE", label, ...constraints };
}

function optional(
  label: string,
  constraints: Omit<TelemetryRule, "applicability" | "label"> = {}
): TelemetryRule {
  return { applicability: "OPTIONAL", label, ...constraints };
}

function notApplicable(label: string, modelDefault?: number): TelemetryRule {
  return { applicability: "NOT_APPLICABLE", label, modelDefault };
}