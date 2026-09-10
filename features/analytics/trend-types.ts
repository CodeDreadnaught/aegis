import type { EquipmentCategory, RiskLevel } from "@/generated/prisma/enums";

export type PredictionTrendRange = 1 | 7 | 30 | "all";
export type PredictionTrendGranularity = "hour" | "4hour" | "day" | "week" | "month" | "multi-month";
export type FleetTrendMetric =
  | "HIGH_RISK_PERCENT"
  | "HIGH_RISK_COUNT"
  | "COVERAGE"
  | "FRESH_STATES";
export type AnalyticsTrendMode = "FLEET" | "EQUIPMENT";

export type FleetPredictionTrendPoint = {
  bucketEnd: Date;
  bucketStart: Date;
  carriedForwardEquipmentCount: number;
  fleetHealth: number | null;
  freshEquipmentCount: number;
  highRiskCount: number;
  highRiskPercent: number | null;
  noStateEquipmentCount: number;
  representedEquipmentCount: number;
  staleExcludedEquipmentCount: number;
  totalEligibleEquipmentCount: number;
};

export type FleetPredictionTrendResult = {
  bucketMs: number;
  freshnessDays: number;
  granularity: PredictionTrendGranularity;
  points: FleetPredictionTrendPoint[];
  rangeEnd: Date | null;
  rangeStart: Date | null;
  totalEligibleEquipmentCount: number;
};

export type EquipmentPredictionTrendPoint = {
  createdAt: Date;
  failureProbabilityPercent: number;
  healthScore: number;
  recommendation: string | null;
  recordedAt: Date;
  riskLevel: RiskLevel;
};

export type EquipmentPredictionTrendSummary = {
  currentFailureProbabilityPercent: number;
  currentHealthScore: number;
  currentRecommendation: string | null;
  currentRiskLevel: RiskLevel;
  latestRecordedAt: Date;
} | null;

export type EquipmentPredictionTrendResult = {
  points: EquipmentPredictionTrendPoint[];
  summary: EquipmentPredictionTrendSummary;
};

export type AnalyticsTrendEquipmentOption = {
  assetTag: string;
  category: EquipmentCategory;
  id: string;
  name: string;
};

export type SerializedFleetPredictionTrendPoint = Omit<
  FleetPredictionTrendPoint,
  "bucketEnd" | "bucketStart"
> & {
  bucketEnd: string;
  bucketStart: string;
};

export type SerializedFleetPredictionTrendResult = Omit<
  FleetPredictionTrendResult,
  "points" | "rangeEnd" | "rangeStart"
> & {
  points: SerializedFleetPredictionTrendPoint[];
  rangeEnd: string | null;
  rangeStart: string | null;
};

export type SerializedEquipmentPredictionTrendPoint = Omit<
  EquipmentPredictionTrendPoint,
  "createdAt" | "recordedAt"
> & {
  createdAt: string;
  recordedAt: string;
};

export type SerializedEquipmentPredictionTrendSummary = Omit<
  NonNullable<EquipmentPredictionTrendSummary>,
  "latestRecordedAt"
> & {
  latestRecordedAt: string;
};

export type SerializedEquipmentPredictionTrendResult = {
  points: SerializedEquipmentPredictionTrendPoint[];
  summary: SerializedEquipmentPredictionTrendSummary | null;
};

export type AnalyticsTrendState = {
  category: EquipmentCategory | null;
  equipmentOptions: AnalyticsTrendEquipmentOption[];
  equipmentTrend: SerializedEquipmentPredictionTrendResult;
  fleetMetric: FleetTrendMetric;
  fleetTrend: SerializedFleetPredictionTrendResult;
  selectedEquipmentId: string | null;
  trendMode: AnalyticsTrendMode;
  trendRange: PredictionTrendRange;
};

export const analyticsTrendFilters: Array<{ label: string; value: PredictionTrendRange }> = [
  { label: "1D", value: 1 },
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "All", value: "all" },
];

export const analyticsTrendModes: Array<{ label: string; value: AnalyticsTrendMode }> = [
  { label: "Fleet", value: "FLEET" },
  { label: "Equipment", value: "EQUIPMENT" },
];

export const analyticsFleetMetricOptions: Array<{
  label: string;
  value: FleetTrendMetric;
}> = [
  { label: "High-risk %", value: "HIGH_RISK_PERCENT" },
  { label: "Coverage", value: "COVERAGE" },
  { label: "Fresh states", value: "FRESH_STATES" },
];

export const analyticsCategoryFilters = [
  "PUMP",
  "COMPRESSOR",
  "WELLHEAD",
  "CHRISTMAS_TREE",
  "SEPARATOR",
  "HEAT_EXCHANGER",
  "PRODUCTION_VALVE",
  "PIPELINE",
  "STORAGE_TANK",
  "GENERATOR",
] as const satisfies readonly EquipmentCategory[];

export function parseAnalyticsTrendRange(value: string | null | undefined): PredictionTrendRange {
  if (value === "1" || value === "7" || value === "30") {
    return Number(value) as PredictionTrendRange;
  }

  return "all";
}

export function parseAnalyticsTrendMode(value: string | null | undefined): AnalyticsTrendMode {
  return value?.toUpperCase() === "EQUIPMENT" ? "EQUIPMENT" : "FLEET";
}

export function parseAnalyticsTrendCategory(value: string | null | undefined) {
  return analyticsCategoryFilters.includes(value as EquipmentCategory)
    ? (value as EquipmentCategory)
    : undefined;
}

export function parseAnalyticsFleetMetric(value: string | null | undefined): FleetTrendMetric {
  return analyticsFleetMetricOptions.some(option => option.value === value)
    ? (value as FleetTrendMetric)
    : "HIGH_RISK_PERCENT";
}

export function serializeAnalyticsTrendState(input: {
  category?: EquipmentCategory | null;
  equipmentOptions: AnalyticsTrendEquipmentOption[];
  equipmentTrend: EquipmentPredictionTrendResult;
  fleetMetric: FleetTrendMetric;
  fleetTrend: FleetPredictionTrendResult;
  selectedEquipmentId: string | null;
  trendMode: AnalyticsTrendMode;
  trendRange: PredictionTrendRange;
}): AnalyticsTrendState {
  return {
    category: input.category ?? null,
    equipmentOptions: input.equipmentOptions,
    equipmentTrend: serializeEquipmentPredictionTrendResult(input.equipmentTrend),
    fleetMetric: input.fleetMetric,
    fleetTrend: serializeFleetPredictionTrendResult(input.fleetTrend),
    selectedEquipmentId: input.selectedEquipmentId,
    trendMode: input.trendMode,
    trendRange: input.trendRange,
  };
}

export function serializeFleetPredictionTrendResult(
  result: FleetPredictionTrendResult,
): SerializedFleetPredictionTrendResult {
  return {
    ...result,
    points: result.points.map(point => ({
      ...point,
      bucketEnd: point.bucketEnd.toISOString(),
      bucketStart: point.bucketStart.toISOString(),
    })),
    rangeEnd: result.rangeEnd?.toISOString() ?? null,
    rangeStart: result.rangeStart?.toISOString() ?? null,
  };
}

export function serializeEquipmentPredictionTrendResult(
  result: EquipmentPredictionTrendResult,
): SerializedEquipmentPredictionTrendResult {
  return {
    points: result.points.map(point => ({
      ...point,
      createdAt: point.createdAt.toISOString(),
      recordedAt: point.recordedAt.toISOString(),
    })),
    summary: result.summary
      ? {
          ...result.summary,
          latestRecordedAt: result.summary.latestRecordedAt.toISOString(),
        }
      : null,
  };
}