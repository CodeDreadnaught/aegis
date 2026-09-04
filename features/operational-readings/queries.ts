import "server-only";

import type { EquipmentCategory } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

export type OperationalDataFilters = {
  category?: EquipmentCategory;
  dateFrom?: Date;
  dateTo?: Date;
  query?: string;
};

export async function getOperationalDataWorkspace(
  page = 1,
  filters: OperationalDataFilters = {},
) {
  const skip = (Math.max(1, page) - 1) * tablePageSize;
  const where = buildReadingWhere(filters);
  const [
    equipment,
    readings,
    readingCount,
    totalReadingCount,
    metricReadings,
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
    prisma.operationalReading.findMany({
      where,
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
    prisma.operationalReading.count({ where }),
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
    totalReadingCount,
  };
}

function buildReadingWhere(filters: OperationalDataFilters) {
  const and: Prisma.OperationalReadingWhereInput[] = [];
  const query = filters.query?.trim();

  if (query) {
    and.push({
      OR: [
        { sourceType: { contains: query, mode: "insensitive" } },
        {
          equipment: {
            is: {
              OR: [
                { assetTag: { contains: query } },
                { name: { contains: query } },
                { location: { contains: query } },
              ],
            },
          },
        },
      ],
    });
  }

  if (filters.category) {
    and.push({
      equipment: {
        is: {
          category: filters.category,
        },
      },
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    and.push({
      recordedAt: {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lt: filters.dateTo } : {}),
      },
    });
  }

  return and.length ? { AND: and } : {};
}
