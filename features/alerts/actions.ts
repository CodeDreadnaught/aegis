"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

export async function acknowledgeAlertAction(id: string) {
  const actor = await requirePermission("manageAlerts");

  const alert = await prisma.alert.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedById: actor.id,
    },
    select: {
      id: true,
      equipmentId: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "ACKNOWLEDGE_ALERT",
      entityType: "Alert",
      entityId: alert.id,
      metadata: {
        equipmentId: alert.equipmentId,
        status: alert.status,
      },
    },
  });

  revalidatePath("/alerts");
}

export async function resolveAlertAction(id: string) {
  const actor = await requirePermission("manageAlerts");

  const alert = await prisma.alert.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
    select: {
      id: true,
      equipmentId: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "RESOLVE_ALERT",
      entityType: "Alert",
      entityId: alert.id,
      metadata: {
        equipmentId: alert.equipmentId,
        status: alert.status,
      },
    },
  });

  revalidatePath("/alerts");
}
