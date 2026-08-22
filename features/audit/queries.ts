import "server-only";

import { prisma } from "@/server/db/client";

export async function getAuditTrail() {
  return prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      timestamp: true,
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
