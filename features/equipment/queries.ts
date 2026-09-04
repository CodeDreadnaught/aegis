import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";
import type {
  EquipmentCategory,
  EquipmentStatus,
} from "@/generated/prisma/enums";

type EquipmentListFilters = {
  category?: EquipmentCategory;
  status?: EquipmentStatus;
};

export async function getEquipmentList(
  query?: string,
  filters: EquipmentListFilters = {}
) {
  const search = query?.trim();

  return prisma.equipment.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { assetTag: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { assetTag: "asc" }],
    select: {
      id: true,
      assetTag: true,
      name: true,
      category: true,
      status: true,
      location: true,
      updatedAt: true,
      _count: {
        select: {
          maintenanceRecords: true,
          operationalReadings: true,
        },
      },
      maintenanceRecords: {
        orderBy: { performedAt: "desc" },
        take: 1,
        select: {
          nextDueDate: true,
          status: true,
        },
      },
      operationalReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: {
          recordedAt: true,
        },
      },
      predictions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          failureProbability: true,
          healthScore: true,
          riskLevel: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getEquipmentDetails(id: string, readingPage = 1) {
  const readingSkip = (Math.max(1, readingPage) - 1) * tablePageSize;
  return prisma.equipment.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          maintenanceRecords: true,
          operationalReadings: true,
          predictions: true,
        },
      },
      operationalReadings: {
        orderBy: { recordedAt: "desc" },
        skip: readingSkip,
        take: tablePageSize,
      },
      maintenanceRecords: {
        orderBy: { performedAt: "desc" },
        take: 8,
      },
      predictions: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          recommendations: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
        },
      },
    },
  });
}


