"use server";

import { revalidatePath } from "next/cache";

import { maintenanceRecordSchema } from "@/features/maintenance/validation";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

function parseMaintenanceForm(formData: FormData) {
  return maintenanceRecordSchema.parse({
    equipmentId: formData.get("equipmentId"),
    type: formData.get("type"),
    description: formData.get("description"),
    performedAt: formData.get("performedAt"),
    nextDueDate: formData.get("nextDueDate"),
    status: formData.get("status") || "COMPLETED",
  });
}

export async function createMaintenanceRecordAction(formData: FormData) {
  const actor = await requirePermission("recordMaintenance");
  const input = parseMaintenanceForm(formData);

  const record = await prisma.maintenanceRecord.create({
    data: {
      equipmentId: input.equipmentId,
      type: input.type,
      description: input.description,
      performedAt: input.performedAt,
      nextDueDate: input.nextDueDate,
      status: input.status,
      recordedById: actor.id,
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
      action: "CREATE_MAINTENANCE_RECORD",
      entityType: "MaintenanceRecord",
      entityId: record.id,
      metadata: {
        equipmentId: record.equipmentId,
        status: record.status,
      },
    },
  });

  revalidatePath("/maintenance");
  revalidatePath(`/equipment/${record.equipmentId}`);
}
