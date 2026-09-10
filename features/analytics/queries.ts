import "server-only";

import {
  EquipmentCategory,
  PredictionJobStatus,
  RiskLevel,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  getEquipmentPredictionTrend,
  getFleetPredictionTrend,
  getFleetTrendFreshnessDays,
} from "@/features/analytics/prediction-trend";
import type {
  AnalyticsTrendMode as AnalyticsTrendModeValue,
  EquipmentPredictionTrendResult,
  FleetPredictionTrendResult,
  FleetTrendMetric,
  PredictionTrendRange,
} from "@/features/analytics/trend-types";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

const storedPredictionLimit = 100;
export const storedPredictionPageSize = 12;

export type AnalyticsJobFilter = "NOT_QUEUED" | PredictionJobStatus;
export type AnalyticsLatestFilter = "NOT_RUN" | RiskLevel;
export type AnalyticsTrendRange = PredictionTrendRange;
export type AnalyticsTrendMode = AnalyticsTrendModeValue;
export type AnalyticsFleetMetric = FleetTrendMetric;

export type AnalyticsFilters = {
  category?: EquipmentCategory;
  equipmentId?: string;
  fleetMetric?: AnalyticsFleetMetric;
  job?: AnalyticsJobFilter;
  latest?: AnalyticsLatestFilter;
  predictionPage?: number;
  query?: string;
  trendMode?: AnalyticsTrendMode;
  trendRange?: AnalyticsTrendRange;
};

export type AnalyticsTrendFilters = Pick<
  AnalyticsFilters,
  "category" | "equipmentId" | "fleetMetric" | "trendMode" | "trendRange"
>;

type AnalyticsTrendEquipmentOption = {
  assetTag: string;
  category: EquipmentCategory;
  id: string;
  name: string;
};

type AnalyticsTrendWorkspace = {
  category: EquipmentCategory | null;
  equipmentOptions: AnalyticsTrendEquipmentOption[];
  equipmentTrend: EquipmentPredictionTrendResult;
  fleetMetric: AnalyticsFleetMetric;
  fleetTrend: FleetPredictionTrendResult;
  selectedEquipmentId: string | null;
  trendMode: AnalyticsTrendMode;
  trendRange: AnalyticsTrendRange;
};

type NormalizedAnalyticsTrendFilters = {
  category?: EquipmentCategory;
  equipmentId?: string;
  fleetMetric: AnalyticsFleetMetric;
  trendMode: AnalyticsTrendMode;
  trendRange: AnalyticsTrendRange;
};

const analyticsTrendWorkspaceCache = new Map<
  string,
  { expiresAt: number; value: Promise<AnalyticsTrendWorkspace> }
>();

let equipmentOptionsCache:
  | { expiresAt: number; value: Promise<AnalyticsTrendEquipmentOption[]> }
  | null = null;

export async function getAnalyticsTrendWorkspace(
  filters: AnalyticsTrendFilters = {},
) {
  const normalized = normalizeAnalyticsTrendFilters(filters);
  const cacheKey = buildAnalyticsTrendCacheKey(normalized);
  const now = Date.now();
  const cached = analyticsTrendWorkspaceCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = getAnalyticsTrendWorkspaceFresh(normalized).catch((error) => {
    analyticsTrendWorkspaceCache.delete(cacheKey);
    throw error;
  });

  const cacheTtl = getAnalyticsTrendCacheTtl(normalized.trendRange);
  const cacheEntry = {
    expiresAt: now + cacheTtl,
    value,
  };

  value.then(
    () => {
      cacheEntry.expiresAt = Date.now() + cacheTtl;
    },
    () => undefined,
  );
  analyticsTrendWorkspaceCache.set(cacheKey, cacheEntry);

  return value;
}

async function getAnalyticsTrendWorkspaceFresh(
  filters: NormalizedAnalyticsTrendFilters,
): Promise<AnalyticsTrendWorkspace> {
  const equipmentOptionsPromise = getAnalyticsTrendEquipmentOptions();

  if (filters.trendMode === "FLEET") {
    const [equipmentOptions, fleetTrend] = await Promise.all([
      equipmentOptionsPromise,
      getFleetPredictionTrend({
        category: filters.category,
        range: filters.trendRange,
      }),
    ]);

    return {
      category: filters.category ?? null,
      equipmentOptions,
      equipmentTrend: emptyEquipmentPredictionTrendResult(),
      fleetMetric: filters.fleetMetric,
      fleetTrend,
      selectedEquipmentId: getSelectedTrendEquipmentId(
        equipmentOptions,
        filters.equipmentId,
      ),
      trendMode: filters.trendMode,
      trendRange: filters.trendRange,
    };
  }

  const equipmentOptions = await equipmentOptionsPromise;
  const selectedEquipmentId = getSelectedTrendEquipmentId(
    equipmentOptions,
    filters.equipmentId,
  );
  const equipmentTrend = await getEquipmentPredictionTrend({
    equipmentId: selectedEquipmentId,
    range: filters.trendRange,
  });

  return {
    category: null,
    equipmentOptions,
    equipmentTrend,
    fleetMetric: filters.fleetMetric,
    fleetTrend: emptyFleetPredictionTrendResult(),
    selectedEquipmentId,
    trendMode: filters.trendMode,
    trendRange: filters.trendRange,
  };
}

export async function getAnalyticsWorkspace(
  page = 1,
  filters: AnalyticsFilters = {},
) {
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const readingWhere = buildReadingWhere(filters);
  const totalPredictionCount = await prisma.prediction.count();
  const storedPredictionCount = Math.min(
    totalPredictionCount,
    storedPredictionLimit,
  );
  const predictionPageCount = Math.max(
    1,
    Math.ceil(storedPredictionCount / storedPredictionPageSize),
  );
  const currentPredictionPage = Math.min(
    Math.max(1, filters.predictionPage ?? 1),
    predictionPageCount,
  );
  const predictionSkip = (currentPredictionPage - 1) * storedPredictionPageSize;
  const [
    readings,
    readingCount,
    totalReadingCount,
    predictions,
    summaryPredictions,
    trendWorkspace,
    predictedReadingCount,
    jobStatusGroups,
    riskGroups,
  ] = await Promise.all([
    prisma.operationalReading.findMany({
      where: readingWhere,
      orderBy: { recordedAt: "desc" },
      skip,
      take: tablePageSize,
      select: {
        id: true,
        recordedAt: true,
        sourceType: true,
        parameters: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            location: true,
            name: true,
          },
        },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            riskLevel: true,
            failureProbability: true,
            healthScore: true,
            createdAt: true,
          },
        },
        predictionJob: {
          select: {
            attempts: true,
            lastError: true,
            status: true,
          },
        },
      },
    }),
    prisma.operationalReading.count({ where: readingWhere }),
    prisma.operationalReading.count(),
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      skip: predictionSkip,
      take: storedPredictionPageSize,
      select: {
        id: true,
        failureProbability: true,
        healthScore: true,
        riskLevel: true,
        modelVersion: true,
        thresholdVersion: true,
        createdAt: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            location: true,
            name: true,
          },
        },
        recommendations: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            message: true,
            priority: true,
          },
        },
      },
    }),
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: storedPredictionLimit,
      select: {
        failureProbability: true,
        healthScore: true,
      },
    }),
    getAnalyticsTrendWorkspace(filters),
    prisma.operationalReading.count({
      where: {
        predictions: {
          some: {},
        },
      },
    }),
    prisma.predictionJob.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.prediction.groupBy({
      by: ["riskLevel"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const riskTotals = {
    high: 0,
    low: 0,
    medium: 0,
  };

  for (const group of riskGroups) {
    riskTotals[group.riskLevel.toLowerCase() as keyof typeof riskTotals] =
      group._count._all;
  }

  const jobStatusCounts = {
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
  };

  for (const group of jobStatusGroups) {
    jobStatusCounts[group.status.toLowerCase() as keyof typeof jobStatusCounts] =
      group._count._all;
  }

  return {
    currentPredictionPage,
    ...trendWorkspace,
    jobStatusCounts,
    predictedReadingCount,
    predictionCount: totalPredictionCount,
    predictionPageCount,
    predictions,
    readingCount,
    readings,
    riskTotals,
    storedPredictionCount,
    summaryPredictions,
    totalReadingCount,
  };
}

function getAnalyticsTrendEquipmentOptions() {
  const now = Date.now();

  if (equipmentOptionsCache && equipmentOptionsCache.expiresAt > now) {
    return equipmentOptionsCache.value;
  }

  const value = prisma.equipment.findMany({
    orderBy: [{ category: "asc" }, { assetTag: "asc" }],
    select: {
      assetTag: true,
      category: true,
      id: true,
      name: true,
    },
  }).catch((error) => {
    equipmentOptionsCache = null;
    throw error;
  });

  const cacheEntry = {
    expiresAt: now + 10_000,
    value,
  };

  value.then(
    () => {
      cacheEntry.expiresAt = Date.now() + 10_000;
    },
    () => undefined,
  );
  equipmentOptionsCache = cacheEntry;

  return value;
}

function normalizeAnalyticsTrendFilters(
  filters: AnalyticsTrendFilters,
): NormalizedAnalyticsTrendFilters {
  return {
    category: filters.category,
    equipmentId: filters.equipmentId,
    fleetMetric: filters.fleetMetric ?? "HIGH_RISK_PERCENT",
    trendMode: filters.trendMode ?? "FLEET",
    trendRange: filters.trendRange ?? "all",
  };
}

function buildAnalyticsTrendCacheKey(filters: NormalizedAnalyticsTrendFilters) {
  return [
    filters.trendMode,
    filters.trendRange,
    filters.category ?? "all-categories",
    filters.equipmentId ?? "default-equipment",
    filters.fleetMetric,
  ].join(":");
}

function getAnalyticsTrendCacheTtl(range: AnalyticsTrendRange) {
  return range === "all" ? 10_000 : 5_000;
}

function getSelectedTrendEquipmentId(
  equipmentOptions: AnalyticsTrendEquipmentOption[],
  requestedEquipmentId: string | undefined,
) {
  return (
    equipmentOptions.find(equipment => equipment.id === requestedEquipmentId)?.id ??
    equipmentOptions[0]?.id ??
    null
  );
}

function emptyEquipmentPredictionTrendResult(): EquipmentPredictionTrendResult {
  return { points: [], summary: null };
}

function emptyFleetPredictionTrendResult(): FleetPredictionTrendResult {
  return {
    bucketMs: 0,
    freshnessDays: getFleetTrendFreshnessDays(),
    granularity: "day",
    points: [],
    rangeEnd: null,
    rangeStart: null,
    totalEligibleEquipmentCount: 0,
  };
}

function buildReadingWhere(filters: AnalyticsFilters) {
  const and: Prisma.OperationalReadingWhereInput[] = [];
  const query = filters.query?.trim();

  if (query) {
    and.push({
      OR: [
        { sourceType: { contains: query, mode: "insensitive" } },
        {
          equipment: {
            is: {
              OR: [
                { assetTag: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
                { location: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.latest === "NOT_RUN") {
    and.push({ predictions: { none: {} } });
  } else if (filters.latest) {
    and.push({ predictions: { some: { riskLevel: filters.latest } } });
  }

  if (filters.job === "NOT_QUEUED") {
    and.push({ predictionJob: null, predictions: { none: {} } });
  } else if (filters.job) {
    and.push({ predictionJob: { is: { status: filters.job } } });
  }

  return and.length ? { AND: and } : {};
}