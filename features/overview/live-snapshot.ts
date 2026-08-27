import "server-only";

import { prisma } from "@/server/db/client";

import { overviewActivePredictionWindowMs } from "./live-polling";
import type { OverviewLiveSnapshot } from "./live-types";
import type { OverviewRange } from "./queries";

export function parseOverviewRange(value: string | null): OverviewRange {
  if (value === "1" || value === "7" || value === "30") {
    return Number(value) as OverviewRange;
  }

  return 1;
}

export async function getOverviewLiveSnapshot(
  range: OverviewRange = 1
): Promise<OverviewLiveSnapshot> {
  const since = new Date();
  since.setDate(since.getDate() - range);
  const activePredictionCutoff = new Date(
    Date.now() - overviewActivePredictionWindowMs
  );

  const [
    activePredictionJobCount,
    equipmentCount,
    activeEquipmentCount,
    maintenanceDueCount,
    activeAlertCount,
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
    prisma.prediction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        failureProbability: true,
        healthScore: true,
        equipment: {
          select: {
            assetTag: true,
          },
        },
      },
    }),
    prisma.prediction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        failureProbability: true,
        healthScore: true,
      },
    }),
    prisma.operationalReading.findMany({
      where: { recordedAt: { gte: since } },
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
  const averageFailureProbability = average(
    latestPredictions.map(
      (prediction) => Number(prediction.failureProbability) * 100
    )
  );
  const predictedAssetCoverage = new Set(
    latestPredictions.map((prediction) => prediction.equipment.assetTag)
  ).size;
  const modelScore = latestPredictions.length
    ? Math.max(0, Math.round(100 - averageFailureProbability))
    : 0;
  const signalBars = latestReadings.map((reading) => ({
    vibration: readParameter(reading.parameters, "vibrationMmS"),
    pressure: readParameter(reading.parameters, "pressureBar"),
    flow: readParameter(reading.parameters, "flowRateBpd"),
  }));
  const averageFlow = Math.round(average(signalBars.map((reading) => reading.flow)));
  const averagePressure = Math.round(
    average(signalBars.map((reading) => reading.pressure))
  );
  const averageVibration = Math.round(
    average(signalBars.map((reading) => reading.vibration)) * 10
  );
  const maxFlow = Math.max(1, ...signalBars.map((reading) => reading.flow));
  const maxPressure = Math.max(
    1,
    ...signalBars.map((reading) => reading.pressure)
  );
  const maxVibration = Math.max(
    1,
    ...signalBars.map((reading) => reading.vibration * 10)
  );
  const healthPoints = buildLinePoints(
    predictionTrend
      .slice()
      .reverse()
      .map((prediction) => Number(prediction.healthScore))
  );
  const riskPoints = buildLinePoints(
    predictionTrend
      .slice()
      .reverse()
      .map((prediction) => Number(prediction.failureProbability) * 100)
  );

  return {
    activePredictionJobCount,
    activeAlertCount,
    activeEquipmentCount,
    activeRate: percentage(activeEquipmentCount, equipmentCount),
    averageFlow,
    averageHealth: Math.round(averageHealth),
    averagePressure,
    averageVibration,
    equipmentCount,
    healthArea: healthPoints.area,
    healthCoordinates: healthPoints.coordinates,
    healthPath: healthPoints.path,
    maintenanceDueCount,
    modelScore,
    predictionCount: latestPredictions.length,
    predictionCoverage: percentage(predictedAssetCoverage, equipmentCount),
    predictionSampleCount: predictionTrend.length,
    predictedAssetCoverage,
    riskPath: riskPoints.path,
    sensorFlowPercent: percentage(averageFlow, maxFlow),
    sensorPressurePercent: percentage(averagePressure, maxPressure),
    sensorVibrationPercent: percentage(averageVibration, maxVibration),
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

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}

function buildLinePoints(values: number[]) {
  const width = 680;
  const height = 230;
  const top = 12;
  const fallback = values.length ? values : [0];
  const max = Math.max(100, ...fallback);
  const coordinates = fallback.map((value, index) => {
    const x =
      fallback.length === 1 ? width / 2 : (index / (fallback.length - 1)) * width;
    const y = top + height - (Math.min(value, max) / max) * height;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });
  const path = buildSmoothPath(coordinates);
  const area = coordinates.length
    ? `${path} L ${width},${height + top} L 0,${height + top} Z`
    : "";

  return {
    area,
    coordinates,
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
