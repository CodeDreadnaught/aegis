import "server-only";

import { prisma } from "@/server/db/client";

export async function getMaintenanceWorkspace() {
  const [equipment, records] = await Promise.all([
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
      },
    }),
    prisma.maintenanceRecord.findMany({
      orderBy: [{ nextDueDate: "asc" }, { performedAt: "desc" }],
      take: 30,
      select: {
        id: true,
        type: true,
        description: true,
        performedAt: true,
        nextDueDate: true,
        status: true,
        equipment: {
          select: {
            assetTag: true,
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
  ]);

  const totals = records.reduce(
    (summary, record) => {
      summary.total += 1;
      summary[record.status.toLowerCase() as keyof typeof summary] += 1;
      return summary;
    },
    {
      total: 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
      deferred: 0,
    }
  );

  return {
    equipment,
    records,
    totals,
  };
}
