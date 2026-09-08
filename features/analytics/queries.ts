import "server-only";

import { EquipmentCategory, PredictionJobStatus, RiskLevel } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  getEquipmentPredictionTrend,
  getFleetPredictionTrend,
  type FleetTrendMetric,
  type PredictionTrendRange,
} from "@/features/analytics/prediction-trend";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

const storedPredictionLimit = 100;
export const storedPredictionPageSize = 12;

export type AnalyticsJobFilter = "NOT_QUEUED" | PredictionJobStatus;
export type AnalyticsLatestFilter = "NOT_RUN" | RiskLevel;
export type AnalyticsTrendRange = PredictionTrendRange;
export type AnalyticsTrendMode = "FLEET" | "EQUIPMENT";
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
  const trendRange = filters.trendRange ?? "all";
  const trendMode = filters.trendMode ?? "FLEET";
  const equipmentOptions = await prisma.equipment.findMany({
    orderBy: [{ category: "asc" }, { assetTag: "asc" }],
    select: {
      assetTag: true,
      category: true,
      id: true,
      name: true,
    },
  });
  const selectedEquipmentId =
    equipmentOptions.find((equipment) => equipment.id === filters.equipmentId)?.id ??
    equipmentOptions[0]?.id ??
    null;
  const [
    readings,
    readingCount,
    totalReadingCount,
    predictions,
    summaryPredictions,
    fleetTrend,
    equipmentTrend,
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
    getFleetPredictionTrend({
      category: filters.category,
      range: trendRange,
    }),
    trendMode === "EQUIPMENT"
      ? getEquipmentPredictionTrend({
          equipmentId: selectedEquipmentId,
          range: trendRange,
        })
      : Promise.resolve({ points: [], summary: null }),
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
    equipmentOptions,
    equipmentTrend,
    fleetMetric: filters.fleetMetric ?? "HIGH_RISK_PERCENT",
    fleetTrend,
    jobStatusCounts,
    predictedReadingCount,
    predictionCount: totalPredictionCount,
    predictions,
    readingCount,
    readings,
    riskTotals,
    selectedEquipmentId,
    storedPredictionCount,
    summaryPredictions,
    totalReadingCount,
    trendMode,
    trendRange,
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
