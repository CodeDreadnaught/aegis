"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { equipmentSchema } from "@/features/equipment/validation";
import { prisma } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";

function parseEquipmentForm(formData: FormData) {
  return equipmentSchema.parse({
    assetTag: formData.get("assetTag"),
    name: formData.get("name"),
    category: formData.get("category"),
    status: formData.get("status") || "ACTIVE",
    location: formData.get("location"),
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    installationDate: formData.get("installationDate"),
    description: formData.get("description"),
  });
}

export async function createEquipmentAction(formData: FormData) {
  await requirePermission("createEquipment");
  const input = parseEquipmentForm(formData);

  const equipment = await prisma.equipment.create({
    data: input,
    select: { id: true },
  });

  revalidatePath("/equipment");
  redirect(`/equipment/${equipment.id}`);
}

export async function updateEquipmentAction(id: string, formData: FormData) {
  await requirePermission("updateEquipment");
  const input = parseEquipmentForm(formData);

  await prisma.equipment.update({
    where: { id },
    data: input,
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
  redirect(`/equipment/${id}`);
}

export async function decommissionEquipmentAction(id: string) {
  await requirePermission("deleteEquipment");

  await prisma.equipment.update({
    where: { id },
    data: { status: "DECOMMISSIONED" },
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
}
