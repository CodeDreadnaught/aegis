import "server-only";

import { PredictionJobStatus, RiskLevel } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

const storedPredictionLimit = 100;
export const storedPredictionPageSize = 12;

export type AnalyticsJobFilter = "NOT_QUEUED" | PredictionJobStatus;
export type AnalyticsLatestFilter = "NOT_RUN" | RiskLevel;

export type AnalyticsFilters = {
  job?: AnalyticsJobFilter;
  latest?: AnalyticsLatestFilter;
  predictionPage?: number;
  query?: string;
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
  const [
    readings,
    readingCount,
    totalReadingCount,
    predictions,
    summaryPredictions,
    trendPredictions,
    predictedReadingCount,
    pendingJobCount,
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
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        failureProbability: true,
        healthScore: true,
      },
    }),
    prisma.operationalReading.count({
      where: {
        predictions: {
          some: {},
        },
      },
    }),
    prisma.predictionJob.count({
      where: {
        status: {
          in: [PredictionJobStatus.PENDING, PredictionJobStatus.PROCESSING],
        },
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

  return {
    currentPredictionPage,
    pendingJobCount,
    predictedReadingCount,
    predictionCount: totalPredictionCount,
    predictions,
    readingCount,
    readings,
    riskTotals,
    storedPredictionCount,
    summaryPredictions,
    totalReadingCount,
    trendPredictions,
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
