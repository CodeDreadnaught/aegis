import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import {
  getFleetPredictionTrend,
  getPredictionTrendRangeWindow,
} from "@/features/analytics/prediction-trend";
import { prisma } from "@/server/db/client";

import { overviewActivePredictionWindowMs } from "./live-polling";
import type { OverviewLiveSnapshot } from "./live-types";
import type { OverviewRange } from "./queries";
import { calculateAiReadinessScore, percentage } from "./score";

export function parseOverviewRange(value: string | null): OverviewRange {
  if (value === "all") {
    return value;
  }

  if (value === "1" || value === "7" || value === "30") {
    return Number(value) as OverviewRange;
  }

  return 1;
}

export async function getOverviewLiveSnapshot(
  range: OverviewRange = 1
): Promise<OverviewLiveSnapshot> {
  const now = new Date();
  const operationalReadingExtent = await prisma.operationalReading.aggregate({
    _max: { recordedAt: true },
    _min: { recordedAt: true },
  });
  const readingRange = getPredictionTrendRangeWindow({
    extent: {
      maxRecordedAt: operationalReadingExtent._max.recordedAt,
      minRecordedAt: operationalReadingExtent._min.recordedAt,
    },
    now,
    range,
  });
  const readingRecordedWhere: Prisma.OperationalReadingWhereInput = readingRange
    ? {
        recordedAt: {
          gte: readingRange.rangeStart,
          lte: readingRange.rangeEnd,
        },
      }
    : {};
  const activePredictionCutoff = new Date(
    Date.now() - overviewActivePredictionWindowMs
  );

  const [
    activePredictionJobCount,
    equipmentCount,
    activeEquipmentCount,
    maintenanceDueCount,
    activeAlertCount,
    predictionRunCount,
    latestPredictions,
    predictionTrend,
    latestReadings,
  ] = await Promise.all([
    prisma.predictionJob.count({
      where: {
        attempts: { lt: 3 },
        OR: [
          {
            createdAt: { gte: activePredictionCutoff },
            status: "PENDING",
          },
          {
            status: "PROCESSING",
            updatedAt: { gte: activePredictionCutoff },
          },
        ],
      },
    }),
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: "ACTIVE" } }),
    prisma.maintenanceRecord.count({
      where: {
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        nextDueDate: { not: null },
      },
    }),
    prisma.alert.count({ where: { status: "ACTIVE" } }),
    prisma.prediction.count(),
    prisma.$queryRaw<Array<{ healthScore: Prisma.Decimal }>>`
      SELECT DISTINCT ON (p."equipmentId")
        p."healthScore"
      FROM "Prediction" p
      INNER JOIN "OperationalReading" r ON r.id = p."operationalReadingId"
      ORDER BY p."equipmentId", r."recordedAt" DESC, p."createdAt" DESC, p.id DESC
    `,
    getFleetPredictionTrend({ range, now }),

    prisma.operationalReading.findMany({
      where: readingRecordedWhere,
      orderBy: { recordedAt: "desc" },
      take: 10,
      select: {
        parameters: true,
      },
    }),
  ]);

  const averageHealth = average(
    latestPredictions.map((prediction) => Number(prediction.healthScore))
  );
  const predictedAssetCoverage = latestPredictions.length;
  const aiScore = calculateAiReadinessScore({
    equipmentCount,
    hasRecentReadings: latestReadings.length > 0,
    predictedAssetCoverage,
    predictionRunCount,
  });
  const signalBars = latestReadings.slice().reverse().map((reading) => ({
    pressure: readParameter(reading.parameters, "pressureBar"),
    flow: readParameter(reading.parameters, "flowRateBpd"),
  }));
  const averageFlow = Math.round(
    average(signalBars.map((reading) => reading.flow))
  );
  const averagePressure = Math.round(
    average(signalBars.map((reading) => reading.pressure))
  );
  const maxFlow = Math.max(1, ...signalBars.map((reading) => reading.flow));
  const maxPressure = Math.max(
    1,
    ...signalBars.map((reading) => reading.pressure)
  );
  const healthPoints = buildLinePoints(
    predictionTrend.points.map((point) => point.fleetHealth)
  );
  const sensorFlowPoints = buildSparklinePoints(
    signalBars.map((reading) => reading.flow)
  );
  const sensorPressurePoints = buildSparklinePoints(
    signalBars.map((reading) => reading.pressure)
  );
  const riskPoints = buildLinePoints(
    predictionTrend.points.map((point) => point.highRiskPercent)
  );

  return {
    activePredictionJobCount,
    activeAlertCount,
    activeEquipmentCount,
    activeRate: percentage(activeEquipmentCount, equipmentCount),
    averageFlow,
    averageHealth: Math.round(averageHealth),
    averagePressure,
    equipmentCount,
    healthArea: healthPoints.area,
    healthCoordinates: healthPoints.coordinates,
    healthPath: healthPoints.path,
    maintenanceDueCount,
    aiScore,
    predictionCount: predictionRunCount,
    predictionCoverage: percentage(predictedAssetCoverage, equipmentCount),
    predictionSampleCount: predictionTrend.points.length,
    predictedAssetCoverage,
    riskPath: riskPoints.path,
    sensorFlowPath: sensorFlowPoints.path,
    sensorFlowPercent: percentage(averageFlow, maxFlow),
    sensorPressurePath: sensorPressurePoints.path,
    sensorPressurePercent: percentage(averagePressure, maxPressure),
    sensorSampleCount: signalBars.length,
    syncedAt: new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date()),
  };
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (!validValues.length) {
    return 0;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}


function buildSparklinePoints(values: number[]) {
  const width = 180;
  const height = 32;
  const top = 4;
  const fallback = values.length ? values : [0];
  const max = Math.max(1, ...fallback);
  const coordinates = fallback.map((value, index) => {
    const x =
      fallback.length === 1
        ? width / 2
        : (index / (fallback.length - 1)) * width;
    const y = top + height - (Math.min(value, max) / max) * height;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });

  return {
    coordinates,
    path: buildSmoothPath(coordinates),
  };
}
function buildLinePoints(values: Array<number | null>) {
  const left = 18;
  const width = 604;
  const height = 216;
  const top = 12;
  const baseY = height + top;
  const valueCount = Math.max(values.length, 1);
  const coordinates = values.map((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    const x =
      valueCount === 1
        ? left + width / 2
        : left + (index / (valueCount - 1)) * width;
    const y = top + height - (Math.min(Math.max(value, 0), 100) / 100) * height;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let currentSegment: Array<{ x: number; y: number }> = [];

  for (const coordinate of coordinates) {
    if (!coordinate) {
      if (currentSegment.length) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      continue;
    }

    currentSegment.push(coordinate);
  }

  if (currentSegment.length) {
    segments.push(currentSegment);
  }

  const path = segments.map(segment => buildSmoothPath(segment)).join(" ");
  const area = segments
    .filter(segment => segment.length > 1)
    .map((segment) => {
      const segmentPath = buildSmoothPath(segment);
      const first = segment[0];
      const last = segment[segment.length - 1];

      return `${segmentPath} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
    })
    .join(" ");

  return {
    area,
    coordinates: coordinates.filter(
      (coordinate): coordinate is { x: number; y: number } => coordinate !== null,
    ),
    path,
  };
}

function buildSmoothPath(coordinates: Array<{ x: number; y: number }>) {
  if (!coordinates.length) {
    return "";
  }

  if (coordinates.length === 1) {
    const [{ x, y }] = coordinates;

    return `M ${x},${y}`;
  }

  return coordinates.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x},${point.y}`;
    }

    const previous = coordinates[index - 1];
    const controlX = (previous.x + point.x) / 2;

    return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
  }, "");
}
