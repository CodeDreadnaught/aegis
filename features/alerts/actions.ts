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

export async function acknowledgeAlertsAction(ids: string[]) {
  const actor = await requirePermission("manageAlerts");
  const alertIds = normaliseAlertIds(ids);

  if (!alertIds.length) {
    throw new Error("Select at least one alert to acknowledge.");
  }

  const acknowledgedAt = new Date();
  const alerts = await prisma.alert.updateManyAndReturn({
    where: {
      id: { in: alertIds },
      status: "ACTIVE",
    },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt,
      acknowledgedById: actor.id,
    },
    select: {
      id: true,
      equipmentId: true,
      status: true,
    },
  });

  if (alerts.length) {
    await prisma.auditLog.createMany({
      data: alerts.map((alert) => ({
        userId: actor.id,
        action: "ACKNOWLEDGE_ALERT",
        entityType: "Alert",
        entityId: alert.id,
        metadata: {
          bulk: true,
          equipmentId: alert.equipmentId,
          status: alert.status,
        },
      })),
    });
  }

  revalidatePath("/alerts");

  return { count: alerts.length };
}

export async function resolveAlertsAction(ids: string[]) {
  const actor = await requirePermission("manageAlerts");
  const alertIds = normaliseAlertIds(ids);

  if (!alertIds.length) {
    throw new Error("Select at least one alert to resolve.");
  }

  const resolvedAt = new Date();
  const alerts = await prisma.alert.updateManyAndReturn({
    where: {
      id: { in: alertIds },
      status: { not: "RESOLVED" },
    },
    data: {
      status: "RESOLVED",
      resolvedAt,
    },
    select: {
      id: true,
      equipmentId: true,
      status: true,
    },
  });

  if (alerts.length) {
    await prisma.auditLog.createMany({
      data: alerts.map((alert) => ({
        userId: actor.id,
        action: "RESOLVE_ALERT",
        entityType: "Alert",
        entityId: alert.id,
        metadata: {
          bulk: true,
          equipmentId: alert.equipmentId,
          status: alert.status,
        },
      })),
    });
  }

  revalidatePath("/alerts");

  return { count: alerts.length };
}

function normaliseAlertIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}
