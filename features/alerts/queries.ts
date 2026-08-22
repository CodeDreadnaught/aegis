import "server-only";

import { prisma } from "@/server/db/client";

export async function getAlertsWorkspace() {
  const alerts = await prisma.alert.findMany({
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 100,
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
  });

  const totals = alerts.reduce(
    (summary, alert) => {
      summary.total += 1;
      summary[alert.status.toLowerCase() as keyof typeof summary] += 1;
      return summary;
    },
    {
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
    }
  );

  return {
    alerts,
    totals,
  };
}
