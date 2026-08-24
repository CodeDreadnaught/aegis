import "server-only";

import { prisma } from "@/server/db/client";

export type DashboardRange = 1 | 7 | 30;

export async function getDashboardOverview(range: DashboardRange = 7) {
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
    latestPredictions,
    predictionTrend,
    latestReadings,
    latestMaintenance,
    latestAlerts,
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
    prisma.prediction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        failureProbability: true,
        riskLevel: true,
        healthScore: true,
        modelVersion: true,
        createdAt: true,
        recommendations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            message: true,
            priority: true,
          },
        },
        equipment: {
          select: {
            assetTag: true,
            name: true,
            category: true,
            location: true,
          },
        },
      },
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
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        performedAt: true,
        nextDueDate: true,
        equipment: {
          select: {
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
      take: 6,
      select: {
        id: true,
        message: true,
        severity: true,
        status: true,
        createdAt: true,
        equipment: {
          select: {
            assetTag: true,
            name: true,
          },
        },
      },
    }),
  ]);

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
      maintenanceStatusCounts: Object.fromEntries(
        maintenanceStatusCounts.map((status) => [
          status.status,
          status._count._all,
        ])
      ),
    },
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
      .slice(0, 6),
  };
}
