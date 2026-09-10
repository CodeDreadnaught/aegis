import "server-only";

import type { EquipmentCategory, RiskLevel } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

export type PredictionTrendRange = 1 | 7 | 30 | "all";
export type PredictionTrendGranularity = "hour" | "4hour" | "day" | "week" | "month" | "multi-month";
export type FleetTrendMetric =
  | "HIGH_RISK_PERCENT"
  | "HIGH_RISK_COUNT"
  | "COVERAGE"
  | "FRESH_STATES";

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

export type FleetPredictionState = {
  equipmentId: string;
  failureProbabilityPercent: number;
  healthScore: number;
  recordedAt: Date;
  riskLevel: RiskLevel;
};

type FleetPredictionStateRow = {
  equipmentId: string;
  failureProbability: Prisma.Decimal | number | string;
  healthScore: Prisma.Decimal | number | string;
  recordedAt: Date;
  riskLevel: RiskLevel;
};
export type PredictionTrendBucket = {
  bucketEnd: Date;
  bucketStart: Date;
};

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
export const defaultFleetTrendFreshnessDays = 7;
const maxAllTimeBuckets = 60;

export function getFleetTrendFreshnessDays() {
  const configured = Number(process.env.AEGIS_FLEET_TREND_FRESHNESS_DAYS);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return defaultFleetTrendFreshnessDays;
}

export function getPredictionTrendSince(
  range: PredictionTrendRange,
  now = new Date(),
) {
  if (range === "all") {
    return null;
  }

  return new Date(now.getTime() - range * dayMs);
}

export function getPredictionTrendBucketSpec({
  extent,
  now = new Date(),
  range,
}: {
  extent?: { maxRecordedAt: Date | null; minRecordedAt: Date | null };
  now?: Date;
  range: PredictionTrendRange;
}) {
  if (range === 1) {
    const rangeEnd = getFixedRangeEnd({ extent, now });

    return {
      bucketMs: hourMs,
      granularity: "hour" as const,
      rangeEnd,
      rangeStart: new Date(rangeEnd.getTime() - dayMs),
    };
  }

  if (range === 7) {
    const rangeEnd = getFixedRangeEnd({ extent, now });

    return {
      bucketMs: 4 * hourMs,
      granularity: "4hour" as const,
      rangeEnd,
      rangeStart: new Date(rangeEnd.getTime() - 7 * dayMs),
    };
  }

  if (range === 30) {
    const rangeEnd = getFixedRangeEnd({ extent, now });

    return {
      bucketMs: dayMs,
      granularity: "day" as const,
      rangeEnd,
      rangeStart: new Date(rangeEnd.getTime() - 30 * dayMs),
    };
  }

  if (!extent?.minRecordedAt || !extent.maxRecordedAt) {
    return null;
  }

  const spanMs = Math.max(
    hourMs,
    extent.maxRecordedAt.getTime() - extent.minRecordedAt.getTime(),
  );
  const spanDays = spanMs / dayMs;
  const bucketMs = selectAllTimeBucketMs(spanDays);

  const rangeStart = extent.minRecordedAt;
  const rangeEnd =
    extent.maxRecordedAt.getTime() <= rangeStart.getTime()
      ? new Date(rangeStart.getTime() + bucketMs)
      : extent.maxRecordedAt;

  return {
    bucketMs,
    granularity: describeAllTimeGranularity(bucketMs),
    rangeEnd,
    rangeStart,
  };
}

export function getPredictionTrendRangeWindow({
  extent,
  now = new Date(),
  range,
}: {
  extent?: { maxRecordedAt: Date | null; minRecordedAt: Date | null };
  now?: Date;
  range: PredictionTrendRange;
}) {
  const spec = getPredictionTrendBucketSpec({ extent, now, range });

  if (!spec) {
    return null;
  }

  return {
    rangeEnd: spec.rangeEnd,
    rangeStart: spec.rangeStart,
  };
}
export function buildPredictionTrendBuckets({
  bucketMs,
  rangeEnd,
  rangeStart,
}: {
  bucketMs: number;
  rangeEnd: Date;
  rangeStart: Date;
}): PredictionTrendBucket[] {
  if (rangeEnd.getTime() <= rangeStart.getTime() || bucketMs <= 0) {
    return [];
  }

  const buckets: PredictionTrendBucket[] = [];
  let cursor = rangeStart.getTime();
  const endTime = rangeEnd.getTime();

  while (cursor < endTime && buckets.length <= maxAllTimeBuckets + 48) {
    const next = Math.min(cursor + bucketMs, endTime);

    buckets.push({
      bucketEnd: new Date(next),
      bucketStart: new Date(cursor),
    });

    cursor = next;
  }

  return buckets;
}

export function aggregateFleetPredictionStates({
  buckets,
  equipmentIds,
  freshnessMs,
  states,
}: {
  buckets: PredictionTrendBucket[];
  equipmentIds: string[];
  freshnessMs: number;
  states: FleetPredictionState[];
}): FleetPredictionTrendPoint[] {
  const totalEligibleEquipmentCount = equipmentIds.length;
  const statesByEquipment = new Map<string, FleetPredictionState[]>();

  for (const state of states) {
    if (!Number.isFinite(state.healthScore) || !Number.isFinite(state.failureProbabilityPercent)) {
      continue;
    }

    const existing = statesByEquipment.get(state.equipmentId) ?? [];
    existing.push(state);
    statesByEquipment.set(state.equipmentId, existing);
  }

  for (const equipmentStates of statesByEquipment.values()) {
    equipmentStates.sort(compareFleetStates);
  }

  const cursors = new Map<string, number>();
  const latestByEquipment = new Map<string, FleetPredictionState>();

  return buckets.map((bucket) => {
    let carriedForwardEquipmentCount = 0;
    let freshEquipmentCount = 0;
    let healthTotal = 0;
    let highRiskCount = 0;
    let representedEquipmentCount = 0;
    let staleExcludedEquipmentCount = 0;
    const bucketEndTime = bucket.bucketEnd.getTime();
    const bucketStartTime = bucket.bucketStart.getTime();
    const freshnessCutoff = bucketEndTime - freshnessMs;

    for (const equipmentId of equipmentIds) {
      const equipmentStates = statesByEquipment.get(equipmentId) ?? [];
      let cursor = cursors.get(equipmentId) ?? 0;

      while (
        cursor < equipmentStates.length &&
        equipmentStates[cursor].recordedAt.getTime() <= bucketEndTime
      ) {
        latestByEquipment.set(equipmentId, equipmentStates[cursor]);
        cursor += 1;
      }

      cursors.set(equipmentId, cursor);
      const latest = latestByEquipment.get(equipmentId);

      if (!latest) {
        continue;
      }

      const recordedAt = latest.recordedAt.getTime();

      if (recordedAt < freshnessCutoff) {
        staleExcludedEquipmentCount += 1;
        continue;
      }

      representedEquipmentCount += 1;
      healthTotal += latest.healthScore;

      if (latest.riskLevel === "HIGH") {
        highRiskCount += 1;
      }

      if (recordedAt >= bucketStartTime) {
        freshEquipmentCount += 1;
      } else {
        carriedForwardEquipmentCount += 1;
      }
    }

    return {
      bucketEnd: bucket.bucketEnd,
      bucketStart: bucket.bucketStart,
      carriedForwardEquipmentCount,
      fleetHealth: representedEquipmentCount
        ? roundMetric(healthTotal / representedEquipmentCount)
        : null,
      freshEquipmentCount,
      highRiskCount,
      highRiskPercent: representedEquipmentCount
        ? roundMetric((highRiskCount / representedEquipmentCount) * 100)
        : null,
      noStateEquipmentCount:
        totalEligibleEquipmentCount -
        representedEquipmentCount -
        staleExcludedEquipmentCount,
      representedEquipmentCount,
      staleExcludedEquipmentCount,
      totalEligibleEquipmentCount,
    };
  });
}

export async function getFleetPredictionTrend({
  category,
  now = new Date(),
  range,
}: {
  category?: EquipmentCategory;
  now?: Date;
  range: PredictionTrendRange;
}): Promise<FleetPredictionTrendResult> {
  const freshnessDays = getFleetTrendFreshnessDays();
  const freshnessMs = freshnessDays * dayMs;
  const equipmentWhere: Prisma.EquipmentWhereInput = category
    ? { category }
    : {};
  const readingWhere: Prisma.OperationalReadingWhereInput = {
    ...(category ? { equipment: { is: { category } } } : {}),
    predictionEligible: true,
    predictions: { some: {} },
  };
  const [eligibleEquipment, extent] = await Promise.all([
    prisma.equipment.findMany({
      orderBy: [{ category: "asc" }, { assetTag: "asc" }],
      select: { id: true },
      where: equipmentWhere,
    }),
    prisma.operationalReading.aggregate({
      _max: { recordedAt: true },
      _min: { recordedAt: true },
      where: readingWhere,
    }),
  ]);
  const totalEligibleEquipmentCount = eligibleEquipment.length;
  const spec = getPredictionTrendBucketSpec({
    extent: {
      maxRecordedAt: extent._max.recordedAt,
      minRecordedAt: extent._min.recordedAt,
    },
    now,
    range,
  });

  if (!spec || !totalEligibleEquipmentCount) {
    return {
      bucketMs: 0,
      freshnessDays,
      granularity: "day",
      points: [],
      rangeEnd: null,
      rangeStart: null,
      totalEligibleEquipmentCount,
    };
  }

  const buckets = buildPredictionTrendBuckets(spec);
  const historyStart = new Date(spec.rangeStart.getTime() - freshnessMs);
  const rawStates = await getFleetPredictionStateRows({
    equipmentIds: eligibleEquipment.map((equipment) => equipment.id),
    historyStart,
    rangeEnd: spec.rangeEnd,
  });
  const states = rawStates
    .map(
      (state) =>
        ({
          equipmentId: state.equipmentId,
          failureProbabilityPercent: Number(state.failureProbability) * 100,
          healthScore: Number(state.healthScore),
          recordedAt: state.recordedAt,
          riskLevel: state.riskLevel,
        }) satisfies FleetPredictionState,
    )
    .sort(compareFleetStates);

  return {
    bucketMs: spec.bucketMs,
    freshnessDays,
    granularity: spec.granularity,
    points: aggregateFleetPredictionStates({
      buckets,
      equipmentIds: eligibleEquipment.map((equipment) => equipment.id),
      freshnessMs,
      states,
    }),
    rangeEnd: spec.rangeEnd,
    rangeStart: spec.rangeStart,
    totalEligibleEquipmentCount,
  };
}

export async function getEquipmentPredictionTrend({
  equipmentId,
  range,
  now = new Date(),
}: {
  equipmentId: string | null;
  now?: Date;
  range: PredictionTrendRange;
}): Promise<EquipmentPredictionTrendResult> {
  if (!equipmentId) {
    return { points: [], summary: null };
  }

  const extent = await prisma.operationalReading.aggregate({
    _max: { recordedAt: true },
    _min: { recordedAt: true },
    where: {
      equipmentId,
      predictionEligible: true,
      predictions: { some: {} },
    },
  });
  const rangeWindow = getPredictionTrendRangeWindow({
    extent: {
      maxRecordedAt: extent._max.recordedAt,
      minRecordedAt: extent._min.recordedAt,
    },
    now,
    range,
  });

  if (!rangeWindow) {
    return { points: [], summary: null };
  }

  const predictions = await prisma.prediction.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      createdAt: true,
      failureProbability: true,
      healthScore: true,
      operationalReading: {
        select: {
          recordedAt: true,
        },
      },
      recommendations: {
        orderBy: { createdAt: "asc" },
        select: { message: true },
        take: 1,
      },
      riskLevel: true,
    },
    where: {
      equipmentId,
      operationalReading: {
        is: {
          predictionEligible: true,
          recordedAt: {
            gte: rangeWindow.rangeStart,
            lte: rangeWindow.rangeEnd,
          },
        },
      },
    },
  });
  const points = predictions
    .map((prediction) => {
      const recordedAt = prediction.operationalReading?.recordedAt;

      if (!recordedAt) {
        return null;
      }

      return {
        createdAt: prediction.createdAt,
        failureProbabilityPercent: roundMetric(Number(prediction.failureProbability) * 100),
        healthScore: roundMetric(Number(prediction.healthScore)),
        recommendation: prediction.recommendations.at(0)?.message ?? null,
        recordedAt,
        riskLevel: prediction.riskLevel,
      } satisfies EquipmentPredictionTrendPoint;
    })
    .filter((point): point is EquipmentPredictionTrendPoint => point !== null)
    .sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime());
  const latest = points.at(-1);

  return {
    points,
    summary: latest
      ? {
          currentFailureProbabilityPercent: latest.failureProbabilityPercent,
          currentHealthScore: latest.healthScore,
          currentRecommendation: latest.recommendation,
          currentRiskLevel: latest.riskLevel,
          latestRecordedAt: latest.recordedAt,
        }
      : null,
  };
}

function getFleetPredictionStateRows({
  equipmentIds,
  historyStart,
  rangeEnd,
}: {
  equipmentIds: string[];
  historyStart: Date;
  rangeEnd: Date;
}) {
  if (!equipmentIds.length) {
    return Promise.resolve([] as FleetPredictionStateRow[]);
  }

  return prisma.$queryRaw<FleetPredictionStateRow[]>(Prisma.sql`
    SELECT
      p."equipmentId",
      p."failureProbability",
      p."healthScore",
      p."riskLevel",
      r."recordedAt"
    FROM "Prediction" p
    INNER JOIN "OperationalReading" r ON r.id = p."operationalReadingId"
    WHERE p."equipmentId" IN (${Prisma.join(equipmentIds)})
      AND r."predictionEligible" = true
      AND r."recordedAt" >= ${historyStart}
      AND r."recordedAt" <= ${rangeEnd}
    ORDER BY p."equipmentId" ASC, r."recordedAt" ASC, p."createdAt" ASC, p.id ASC
  `);
}
function compareFleetStates(left: FleetPredictionState, right: FleetPredictionState) {
  return (
    left.equipmentId.localeCompare(right.equipmentId) ||
    left.recordedAt.getTime() - right.recordedAt.getTime()
  );
}

function getFixedRangeEnd({
  extent,
  now,
}: {
  extent?: { maxRecordedAt: Date | null; minRecordedAt: Date | null };
  now: Date;
}) {
  const latestRecordedAt = extent?.maxRecordedAt;

  if (latestRecordedAt && latestRecordedAt.getTime() < now.getTime()) {
    return latestRecordedAt;
  }

  return now;
}

function describeAllTimeGranularity(bucketMs: number): PredictionTrendGranularity {
  if (bucketMs <= hourMs) {
    return "hour";
  }

  if (bucketMs <= 4 * hourMs) {
    return "4hour";
  }

  if (bucketMs <= dayMs) {
    return "day";
  }

  if (bucketMs <= 7 * dayMs) {
    return "week";
  }

  if (bucketMs <= 31 * dayMs) {
    return "month";
  }

  return "multi-month";
}

function roundMetric(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}

function selectAllTimeBucketMs(spanDays: number) {
  if (spanDays <= 2) {
    return hourMs;
  }

  if (spanDays <= 60) {
    return dayMs;
  }

  if (spanDays <= 420) {
    return 7 * dayMs;
  }

  const approximateMonthMs = 30 * dayMs;
  const requiredMonthSpan = Math.ceil((spanDays / 30) / maxAllTimeBuckets);

  return Math.max(approximateMonthMs, requiredMonthSpan * approximateMonthMs);
}