import "server-only";

import { AlertSeverity } from "@/generated/prisma/enums";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

export async function getAlertsWorkspace(page = 1) {
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const [
    alerts,
    totalAlerts,
    statusGroups,
    highSeverityCount,
    predictionRiskCount,
  ] = await Promise.all([
    prisma.alert.findMany({
      orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      skip,
      take: tablePageSize,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        message: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            name: true,
          },
        },
        acknowledgedBy: {
          select: {
            name: true,
          },
        },
        prediction: {
          select: {
            riskLevel: true,
            healthScore: true,
          },
        },
      },
    }),
    prisma.alert.count(),
    prisma.alert.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.alert.count({
      where: {
        severity: {
          in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        },
      },
    }),
    prisma.alert.count({
      where: {
        type: "PREDICTION_RISK",
      },
    }),
  ]);

  const totals = {
    acknowledged: 0,
    active: 0,
    highSeverity: highSeverityCount,
    predictionRisk: predictionRiskCount,
    resolved: 0,
    total: totalAlerts,
  };

  for (const group of statusGroups) {
    totals[group.status.toLowerCase() as keyof typeof totals] = group._count._all;
  }

  return {
    alerts,
    totals,
  };
}
