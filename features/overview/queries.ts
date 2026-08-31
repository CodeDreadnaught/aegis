import "server-only";

import type { EquipmentCategory, RiskLevel } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

export type OverviewRange = 1 | 7 | 30;

type LatestPredictionRow = {
  id: string;
  equipmentId: string;
  failureProbability: Prisma.Decimal;
  healthScore: Prisma.Decimal;
  riskLevel: RiskLevel;
  modelVersion: string;
  createdAt: Date;
  equipmentAssetTag: string;
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  equipmentLocation: string;
};

export async function getOverviewWorkspace(range: OverviewRange = 7) {
  const since = new Date();
  since.setDate(since.getDate() - range);

  const [
    equipmentCount,
    activeEquipmentCount,
    maintenanceDueCount,
    activeAlertCount,
    equipmentStatusCounts,
    categoryCounts,
    maintenanceStatusCounts,
    predictionRunCount,
    predictionAssetGroups,
    predictionTrend,
    latestReadings,
    latestMaintenance,
    latestAlerts,
    assetMixEquipment,
  ] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { status: "ACTIVE" } }),
    prisma.maintenanceRecord.count({
      where: {
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        nextDueDate: { not: null },
      },
    }),
    prisma.alert.count({ where: { status: "ACTIVE" } }),
    prisma.equipment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.equipment.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.maintenanceRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.prediction.count({ where: { createdAt: { gte: since } } }),
    prisma.prediction.groupBy({
      by: ["equipmentId"],
      where: { createdAt: { gte: since } },
    }),
    prisma.prediction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        riskLevel: true,
        healthScore: true,
        failureProbability: true,
        createdAt: true,
      },
    }),
    prisma.operationalReading.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "desc" },
      take: 10,
      select: {
        id: true,
        recordedAt: true,
        sourceType: true,
        parameters: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            category: true,
            location: true,
          },
        },
      },
    }),
    prisma.maintenanceRecord.findMany({
      where: { performedAt: { gte: since } },
      orderBy: { performedAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        performedAt: true,
        nextDueDate: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            location: true,
          },
        },
      },
    }),
    prisma.alert.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        message: true,
        severity: true,
        status: true,
        createdAt: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            name: true,
          },
        },
      },
    }),
    prisma.equipment.findMany({
      orderBy: [{ category: "asc" }, { assetTag: "asc" }],
      select: {
        assetTag: true,
        category: true,
        name: true,
      },
    }),
  ]);

  const latestPredictionRows = await prisma.$queryRaw<LatestPredictionRow[]>`
    SELECT DISTINCT ON (p."equipmentId")
      p.id,
      p."equipmentId",
      p."failureProbability",
      p."healthScore",
      p."riskLevel",
      p."modelVersion",
      p."createdAt",
      e."assetTag" AS "equipmentAssetTag",
      e.name AS "equipmentName",
      e.category AS "equipmentCategory",
      e.location AS "equipmentLocation"
    FROM "Prediction" p
    INNER JOIN "Equipment" e ON e.id = p."equipmentId"
    WHERE p."createdAt" >= ${since}
    ORDER BY p."equipmentId", p."createdAt" DESC, p.id DESC
  `;
  const latestPredictions = latestPredictionRows
    .map((prediction) => ({
      id: prediction.id,
      failureProbability: prediction.failureProbability,
      riskLevel: prediction.riskLevel,
      healthScore: prediction.healthScore,
      equipmentId: prediction.equipmentId,
      modelVersion: prediction.modelVersion,
      createdAt: prediction.createdAt,
      equipment: {
        id: prediction.equipmentId,
        assetTag: prediction.equipmentAssetTag,
        name: prediction.equipmentName,
        category: prediction.equipmentCategory,
        location: prediction.equipmentLocation,
      },
    }))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const riskCounts = latestPredictions.reduce(
    (summary, prediction) => {
      summary[prediction.riskLevel.toLowerCase() as keyof typeof summary] += 1;
      return summary;
    },
    {
      low: 0,
      medium: 0,
      high: 0,
    }
  );

  return {
    stats: {
      equipmentCount,
      activeEquipmentCount,
      maintenanceDueCount,
      activeAlertCount,
      riskCounts,
      equipmentStatusCounts: Object.fromEntries(
        equipmentStatusCounts.map((status) => [
          status.status,
          status._count._all,
        ])
      ),
      categoryCounts: categoryCounts.map((category) => ({
        category: category.category,
        count: category._count._all,
      })),
      predictionRunCount,
      predictedAssetCoverage: predictionAssetGroups.length,
      maintenanceStatusCounts: Object.fromEntries(
        maintenanceStatusCounts.map((status) => [
          status.status,
          status._count._all,
        ])
      ),
    },
    assetMixEquipment,
    latestPredictions,
    predictionTrend,
    latestReadings,
    latestMaintenance,
    latestAlerts,
    recentActivity: [
      ...latestReadings.map((reading) => ({
        id: `reading-${reading.id}`,
        type: "Operational reading",
        detail: `${reading.equipment.assetTag} - ${reading.equipment.name}`,
        timestamp: reading.recordedAt,
      })),
      ...latestMaintenance.map((record) => ({
        id: `maintenance-${record.id}`,
        type: record.type,
        detail: `${record.equipment.assetTag} - ${record.equipment.name}`,
        timestamp: record.performedAt,
      })),
      ...latestAlerts.map((alert) => ({
        id: `alert-${alert.id}`,
        type: `${alert.severity} alert`,
        detail: alert.message,
        timestamp: alert.createdAt,
      })),
    ]
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 5),
  };
}
