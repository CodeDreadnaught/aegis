import "server-only";

import type {
  AlertSeverity,
  EquipmentCategory,
  RiskLevel,
} from "@/generated/prisma/enums";
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

type OverviewWorkspace = Awaited<ReturnType<typeof getOverviewWorkspaceFresh>>;

const overviewWorkspaceCache = new Map<
  OverviewRange,
  { expiresAt: number; value: Promise<OverviewWorkspace> }
>();

export async function getOverviewWorkspace(range: OverviewRange = 7) {
  const now = Date.now();
  const cached = overviewWorkspaceCache.get(range);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = getOverviewWorkspaceFresh(range).catch((error) => {
    overviewWorkspaceCache.delete(range);
    throw error;
  });

  overviewWorkspaceCache.set(range, {
    expiresAt: now + getOverviewCacheTtl(range),
    value,
  });

  return value;
}

function getOverviewCacheTtl(range: OverviewRange) {
  return range === 1 ? 5000 : 30000;
}

async function getOverviewWorkspaceFresh(range: OverviewRange = 7) {
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
    latestPredictionRows,
    latestReadings,
    latestMaintenance,
    latestAlerts,
    assetMixEquipment,
    assetPerformanceEquipment,
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
    prisma.$queryRaw<LatestPredictionRow[]>`
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
    `,
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
      where: {
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        nextDueDate: { not: null },
      },
      orderBy: { nextDueDate: "asc" },
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
    prisma.equipment.findMany({
      orderBy: [{ status: "asc" }, { assetTag: "asc" }],
      select: {
        id: true,
        assetTag: true,
        name: true,
        category: true,
        location: true,
        predictions: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
            failureProbability: true,
            healthScore: true,
            riskLevel: true,
          },
        },
      },
    }),
  ]);

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
    assetPerformanceEquipment,
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
        href: "/operational-data",
        timestamp: reading.recordedAt,
      })),
      ...latestMaintenance.map((record) => ({
        id: `maintenance-${record.id}`,
        type: record.type,
        detail: `${record.equipment.assetTag} - ${record.equipment.name}`,
        href: "/maintenance",
        timestamp: record.performedAt,
      })),
      ...latestAlerts.map((alert) => ({
        id: `alert-${alert.id}`,
        type: `${alert.severity} alert`,
        detail: buildAlertActivityDetail(alert),
        href: "/alerts",
        timestamp: alert.createdAt,
      })),
    ]
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 5),
  };
}

function buildAlertActivityDetail(alert: {
  message: string;
  severity: AlertSeverity;
  equipment: { assetTag: string; name: string };
}) {
  const probability = alert.message.match(/failure probability is (\d+)%/i)?.[1];
  const health = alert.message.match(/health score of ([\d.]+)%/i)?.[1];
  const probabilityValue = probability ? Number(probability) : null;
  const healthValue = health ? Number(health) : null;
  const parameters = alert.message.match(/Relevant parameters requiring review: ([^.]+)\./i)?.[1];
  const parameterList = parameters
    ? parameters.split(",").map(parameter => parameter.trim()).filter(Boolean)
    : [];
  const risk = formatRiskLabel(alert.severity);
  const reasonParts = [
    probability ? `${probability}% estimated failure probability` : "elevated model risk",
    health ? `${health}% AEGIS health score` : "reduced model confidence margin",
  ];
  const reason = `${alert.equipment.assetTag} (${alert.equipment.name}) has ${reasonParts.join(" with ")}. ${buildParameterInsight(parameterList, probabilityValue, healthValue)}`;
  const relevantParameters = parameterList.length
    ? parameterList.join(", ")
    : "No single threshold driver isolated; compare latest telemetry with recent operating trend";

  return `Risk: ${risk}. Reason: ${reason} Relevant parameters requiring review: ${relevantParameters}. Recommendation: ${buildActivityRecommendation(parameterList, alert.severity, probabilityValue, healthValue)}.`;
}

function buildParameterInsight(
  parameters: string[],
  probability: number | null,
  health: number | null,
) {
  const hasTorque = parameters.includes("Torque");
  const hasSpeed = parameters.includes("Rotational speed");
  const hasWear = parameters.includes("Tool wear");

  if (health !== null && health < 5) {
    return "The health score is already near the floor, so the alert should be treated as a short-term operating risk rather than a routine trend change.";
  }

  if (probability !== null && probability >= 95) {
    return "The failure probability is in the extreme band, so even small telemetry changes can remove the remaining operating margin.";
  }

  if (hasTorque && hasSpeed) {
    return "Torque and speed are both implicated, which points to a drive/load balance issue instead of a single isolated reading.";
  }

  if (hasTorque && hasWear) {
    return "The load path and wear state are both contributing, so mechanical resistance may be reducing the remaining operating margin.";
  }

  if (hasTorque) {
    return "Torque is the dominant driver, so excess process load, coupling drag, or driven-equipment resistance is the first area to rule out.";
  }

  if (hasSpeed) {
    return "Rotational speed is the dominant driver, so control stability, slip, and restricted movement should be checked under the current load.";
  }

  if (hasWear) {
    return "Tool wear is the dominant driver, so the maintenance window is likely narrowing even if other signals still look stable.";
  }

  return "No single parameter explains the model output, so trend comparison and operator context are needed before deciding the next action.";
}

function buildActivityRecommendation(
  parameters: string[],
  severity: AlertSeverity,
  probability: number | null,
  health: number | null,
) {
  const prefix = severity === "HIGH" ? "Prioritise" : severity === "MEDIUM" ? "Schedule" : "Continue";
  const isExtreme = (probability !== null && probability >= 95) || (health !== null && health < 5);

  if (isExtreme && parameters.includes("Torque") && parameters.includes("Rotational speed")) {
    return `${prefix} same-shift drive-train inspection, reduce avoidable load, and compare the next reading before returning to normal duty`;
  }

  if (isExtreme) {
    return `${prefix} immediate maintenance review and keep the asset out of extended duty until the next reading confirms recovery`;
  }

  if (parameters.includes("Torque") && parameters.includes("Rotational speed")) {
    return `${prefix} a drive-train and load-path review, then repeat the reading under the same duty condition to confirm whether the imbalance persists`;
  }

  if (parameters.includes("Torque")) {
    return `${prefix} inspection of coupling condition, process resistance and load transfer before sustained operation`;
  }

  if (parameters.includes("Rotational speed")) {
    return `${prefix} verification of speed control and mechanical binding before accepting the asset as stable`;
  }

  if (parameters.includes("Tool wear")) {
    return `${prefix} tool inspection or replacement planning and confirm wear limits against maintenance history`;
  }

  return `${prefix} review of latest telemetry, maintenance history and operating context before closing the alert`;
}

function formatRiskLabel(severity: AlertSeverity) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}
