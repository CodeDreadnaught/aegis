import "server-only";

import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

export async function getOperationalDataWorkspace(page = 1) {
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const [equipment, readings, readingCount, metricReadings] = await Promise.all([
    prisma.equipment.findMany({
      where: {
        status: {
          not: "DECOMMISSIONED",
        },
      },
      orderBy: { assetTag: "asc" },
      select: {
        id: true,
        assetTag: true,
        name: true,
        category: true,
      },
    }),
    prisma.operationalReading.findMany({
      orderBy: { recordedAt: "desc" },
      skip,
      take: tablePageSize,
      select: {
        id: true,
        equipmentId: true,
        recordedAt: true,
        sourceType: true,
        parameters: true,
        equipment: {
          select: {
            assetTag: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.operationalReading.count(),
    prisma.operationalReading.findMany({
      orderBy: { recordedAt: "desc" },
      take: 50,
      select: {
        parameters: true,
      },
    }),
  ]);

  return {
    equipment,
    metricReadings,
    readingCount,
    readings,
  };
}
