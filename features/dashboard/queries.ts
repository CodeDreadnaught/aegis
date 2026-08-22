import "server-only";

import { prisma } from "@/server/db/client";

export async function getDashboardOverview() {
  const [
    equipmentCount,
    activeEquipmentCount,
    maintenanceDueCount,
    activeAlertCount,
    latestPredictions,
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
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        riskLevel: true,
        healthScore: true,
        createdAt: true,
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
    prisma.operationalReading.findMany({
      orderBy: { recordedAt: "desc" },
      take: 3,
      select: {
        id: true,
        recordedAt: true,
        equipment: {
          select: {
            assetTag: true,
            name: true,
          },
        },
      },
    }),
    prisma.maintenanceRecord.findMany({
      orderBy: { performedAt: "desc" },
      take: 3,
      select: {
        id: true,
        type: true,
        performedAt: true,
        equipment: {
          select: {
            assetTag: true,
            name: true,
          },
        },
      },
    }),
    prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        message: true,
        severity: true,
        createdAt: true,
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
    },
    latestPredictions,
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
