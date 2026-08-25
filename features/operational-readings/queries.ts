import "server-only";

import { prisma } from "@/server/db/client";

export async function getOperationalDataWorkspace() {
  const [equipment, readings] = await Promise.all([
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
      take: 25,
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
  ]);

  return {
    equipment,
    readings,
  };
}
