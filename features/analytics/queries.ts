import "server-only";

import { prisma } from "@/server/db/client";

export async function getAnalyticsWorkspace() {
  const [readings, predictions] = await Promise.all([
    prisma.operationalReading.findMany({
      orderBy: { recordedAt: "desc" },
      take: 25,
      select: {
        id: true,
        recordedAt: true,
        sourceType: true,
        parameters: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            location: true,
            name: true,
          },
        },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            riskLevel: true,
            failureProbability: true,
            healthScore: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        failureProbability: true,
        healthScore: true,
        riskLevel: true,
        modelVersion: true,
        thresholdVersion: true,
        createdAt: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            location: true,
            name: true,
          },
        },
        recommendations: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            message: true,
            priority: true,
          },
        },
      },
    }),
  ]);

  return {
    readings,
    predictions,
  };
}
