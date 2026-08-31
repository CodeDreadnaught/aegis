import "server-only";

import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

export async function getMaintenanceWorkspace(page = 1) {
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const [equipment, records, totalRecords, statusGroups] = await Promise.all([
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
    prisma.maintenanceRecord.findMany({
      orderBy: [{ nextDueDate: "asc" }, { performedAt: "desc" }],
      skip,
      take: tablePageSize,
      select: {
        id: true,
        type: true,
        description: true,
        performedAt: true,
        nextDueDate: true,
        status: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            category: true,
            name: true,
          },
        },
        recordedBy: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.maintenanceRecord.count(),
    prisma.maintenanceRecord.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const totals = {
    total: totalRecords,
    planned: 0,
    in_progress: 0,
    completed: 0,
    deferred: 0,
  };

  for (const group of statusGroups) {
    totals[group.status.toLowerCase() as keyof typeof totals] = group._count._all;
  }

  return {
    equipment,
    records,
    totals,
  };
}