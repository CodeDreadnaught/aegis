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

function parseEquipmentRows(formData: FormData) {
  const assetTags = formData.getAll("assetTag");

  return assetTags.map((_, index) =>
    equipmentSchema.parse({
      assetTag: formData.getAll("assetTag")[index],
      name: formData.getAll("name")[index],
      category: formData.getAll("category")[index],
      status: formData.getAll("status")[index] || "ACTIVE",
      location: formData.getAll("location")[index],
      manufacturer: formData.getAll("manufacturer")[index],
      model: formData.getAll("model")[index],
      serialNumber: formData.getAll("serialNumber")[index],
      installationDate: formData.getAll("installationDate")[index],
      description: formData.getAll("description")[index],
    })
  );
}

export async function createEquipmentAction(formData: FormData) {
  await requirePermission("createEquipment");
  const registrationMode = formData.get("registrationMode");
  const inputs =
    registrationMode === "sheet"
      ? await parseEquipmentImport(formData)
      : parseEquipmentRows(formData);

  if (!inputs.length) {
    throw new Error("Add at least one equipment record.");
  }

  const equipment = await prisma.$transaction(
    inputs.map((input) =>
      prisma.equipment.create({
        data: input,
        select: { id: true },
      })
    )
  );

  revalidatePath("/equipment");

  if (equipment.length === 1) {
    redirect(`/equipment/${equipment[0].id}?toast=equipment-created`);
  }

  redirect("/equipment?toast=equipment-bulk-created");
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
  redirect(`/equipment/${id}?toast=equipment-updated`);
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

export async function recommissionEquipmentAction(id: string) {
  await requirePermission("updateEquipment");

  await prisma.equipment.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
}

async function parseEquipmentImport(formData: FormData) {
  const file = formData.get("equipmentImportFile");

  if (!file || typeof file !== "object" || !("text" in file)) {
    throw new Error("Upload a CSV equipment register sheet.");
  }

  const equipmentFile = file as File;

  if (!equipmentFile.size) {
    throw new Error("Upload a CSV equipment register sheet.");
  }

  const rows = parseCsv(await equipmentFile.text());

  if (!rows.length) {
    throw new Error("The uploaded asset import file does not contain records.");
  }

  return rows.map((row, index) => {
    const rowNumber = index + 2;

    try {
      return equipmentSchema.parse({
        assetTag: getCell(row, "assetTag", "asset_tag"),
        name: getCell(row, "name", "equipmentName", "equipment_name"),
        category: normaliseEnumCell(
          getCell(row, "category", "equipmentCategory")
        ),
        status:
          normaliseEnumCell(getCell(row, "status", "equipmentStatus")) ??
          "ACTIVE",
        location: getCell(row, "location", "site", "area"),
        manufacturer: getCell(row, "manufacturer", "maker"),
        model: getCell(row, "model", "modelNumber"),
        serialNumber: getCell(row, "serialNumber", "serial_number"),
        installationDate: getCell(row, "installationDate", "installation_date"),
        description: getCell(row, "description", "notes"),
      });
    } catch (error) {
      throw new Error(`Row ${rowNumber} contains invalid equipment values.`, {
        cause: error,
      });
    }
  });
}

function parseCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const [headerLine, ...dataLines] = lines;

  if (!headerLine) {
    return [];
  }

  const headers = splitCsvLine(headerLine).map(normaliseHeader);

  return dataLines.map((line) => {
    const values = splitCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""])
    );
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function getCell(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normaliseHeader(key)];

    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normaliseHeader(header: string) {
  return header.trim().replace(/[\s_-]+/g, "").toLowerCase();
}

function normaliseEnumCell(value: string | undefined) {
  return value?.trim().replace(/[\s-]+/g, "_").toUpperCase();
}
