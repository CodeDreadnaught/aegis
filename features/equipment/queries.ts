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
    take: 50,
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

export async function getEquipmentDetails(id: string) {
  return prisma.equipment.findUnique({
    where: { id },
    include: {
      operationalReadings: {
        orderBy: { recordedAt: "desc" },
        take: 5,
      },
      maintenanceRecords: {
        orderBy: { performedAt: "desc" },
        take: 5,
      },
      predictions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}
