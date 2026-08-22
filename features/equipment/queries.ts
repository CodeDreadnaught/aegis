import { prisma } from "@/server/db/client";

export async function getEquipmentList(query?: string) {
  const search = query?.trim();

  return prisma.equipment.findMany({
    where: search
      ? {
          OR: [
            { assetTag: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
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
