import "server-only";

import { prisma } from "@/server/db/client";

export async function getReportsWorkspace() {
  const [equipment, maintenance, predictions, alerts] = await Promise.all([
    prisma.equipment.findMany({
      orderBy: { assetTag: "asc" },
      select: {
        assetTag: true,
        name: true,
        category: true,
        status: true,
        location: true,
      },
    }),
    prisma.maintenanceRecord.findMany({
      orderBy: { performedAt: "desc" },
      take: 100,
      select: {
        type: true,
        status: true,
        performedAt: true,
        nextDueDate: true,
        equipment: {
          select: {
            assetTag: true,
            name: true,
          },
        },
      },
    }),
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        riskLevel: true,
        healthScore: true,
        failureProbability: true,
        modelVersion: true,
        createdAt: true,
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
      take: 100,
      select: {
        severity: true,
        status: true,
        message: true,
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

  return {
    equipment,
    maintenance,
    predictions,
    alerts,
  };
}
