import "server-only";

import { tablePageSize } from "@/lib/pagination";
import { prisma } from "@/server/db/client";

export async function getAuditTrail(page = 1) {
  const total = await prisma.auditLog.count();
  const pageCount = Math.max(1, Math.ceil(total / tablePageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const skip = (currentPage - 1) * tablePageSize;

  const [entries, userEvents, systemEvents, entityGroups] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      skip,
      take: tablePageSize,
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
    }),
    prisma.auditLog.count({ where: { userId: { not: null } } }),
    prisma.auditLog.count({ where: { userId: null } }),
    prisma.auditLog.groupBy({ by: ["entityType"] }),
  ]);

  return {
    currentPage,
    entries,
    entityTypes: entityGroups.length,
    systemEvents,
    total,
    userEvents,
  };
}