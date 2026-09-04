import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

const dueSoonWindowMs = 1000 * 60 * 60 * 24 * 30;

export type MaintenanceFilters = {
  query?: string;
};

export async function getMaintenanceWorkspace(
  page = 1,
  filters: MaintenanceFilters = {},
) {
  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + dueSoonWindowMs);
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const where = buildMaintenanceWhere(filters);
  const [
    equipment,
    records,
    historyCount,
    totalRecords,
    statusGroups,
    overdueCount,
    dueSoonCount,
    scheduleRecords,
  ] = await Promise.all([
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
      where,
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
    prisma.maintenanceRecord.count({ where }),
    prisma.maintenanceRecord.count(),
    prisma.maintenanceRecord.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.maintenanceRecord.count({
      where: {
        nextDueDate: {
          lt: now,
        },
      },
    }),
    prisma.maintenanceRecord.count({
      where: {
        nextDueDate: {
          gte: now,
          lte: dueSoonCutoff,
        },
      },
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        nextDueDate: {
          gte: now,
        },
      },
      orderBy: [{ nextDueDate: "asc" }, { performedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        type: true,
        nextDueDate: true,
        status: true,
        equipment: {
          select: {
            id: true,
            assetTag: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const totals = {
    total: totalRecords,
    planned: 0,
    in_progress: 0,
    completed: 0,
    deferred: 0,
    overdue: overdueCount,
    dueSoon: dueSoonCount,
  };

  for (const group of statusGroups) {
    totals[group.status.toLowerCase() as keyof typeof totals] = group._count._all;
  }

  return {
    equipment,
    historyCount,
    records,
    scheduleRecords,
    totals,
  };
}

function buildMaintenanceWhere(filters: MaintenanceFilters) {
  const query = filters.query?.trim();

  if (!query) {
    return {};
  }

  return {
    OR: [
      { type: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      {
        equipment: {
          is: {
            OR: [
              { assetTag: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        recordedBy: {
          is: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  } satisfies Prisma.MaintenanceRecordWhereInput;
}
