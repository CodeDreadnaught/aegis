import "server-only";

import { prisma } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";

export async function getUserAdministrationData() {
  await requirePermission("manageUsers");

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
          auditLogs: true,
        },
      },
    },
  });

  const totals = users.reduce(
    (summary, user) => {
      summary.total += 1;
      summary[user.status.toLowerCase() as "active" | "disabled"] += 1;

      if (user.role === "ADMINISTRATOR") {
        summary.administrators += 1;
      }

      return summary;
    },
    {
      total: 0,
      active: 0,
      disabled: 0,
      administrators: 0,
    }
  );

  return {
    users,
    totals,
  };
}

export type UserAdministrationData = Awaited<
  ReturnType<typeof getUserAdministrationData>
>;
