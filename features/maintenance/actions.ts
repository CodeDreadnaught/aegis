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

function parseMaintenanceRows(formData: FormData) {
  const equipmentIds = formData.getAll("equipmentId");

  return equipmentIds.map((_, index) =>
    maintenanceRecordSchema.parse({
      equipmentId: formData.getAll("equipmentId")[index],
      type: formData.getAll("type")[index],
      description: formData.getAll("description")[index],
      performedAt: formData.getAll("performedAt")[index],
      nextDueDate: formData.getAll("nextDueDate")[index],
      status: formData.getAll("status")[index] || "COMPLETED",
    })
  );
}

export async function createMaintenanceRecordAction(formData: FormData) {
  const actor = await requirePermission("recordMaintenance");
  const entryMode = formData.get("entryMode");
  const inputs =
    entryMode === "sheet"
      ? await parseMaintenanceImport(formData)
      : entryMode === "manual"
        ? parseMaintenanceRows(formData)
        : [parseMaintenanceForm(formData)];

  if (!inputs.length) {
    throw new Error("Add at least one maintenance record.");
  }

  const records = await prisma.$transaction(
    inputs.map((input) =>
      prisma.maintenanceRecord.create({
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
      })
    )
  );

  await prisma.auditLog.createMany({
    data: records.map((record) => ({
      userId: actor.id,
      action:
        entryMode === "sheet"
          ? "IMPORT_MAINTENANCE_RECORDS"
          : "CREATE_MAINTENANCE_RECORD",
      entityType: "MaintenanceRecord",
      entityId: record.id,
      metadata: {
        equipmentId: record.equipmentId,
        status: record.status,
      },
    })),
  });

  revalidatePath("/maintenance");

  for (const equipmentId of new Set(records.map((record) => record.equipmentId))) {
    revalidatePath(`/equipment/${equipmentId}`);
  }

  return { count: records.length };
}

async function parseMaintenanceImport(formData: FormData) {
  const file = formData.get("maintenanceImportFile");

  if (!file || typeof file !== "object" || !("text" in file)) {
    throw new Error("Upload a CSV maintenance import sheet.");
  }

  const maintenanceFile = file as File;

  if (!maintenanceFile.size) {
    throw new Error("Upload a CSV maintenance import sheet.");
  }

  const rows = parseCsv(await maintenanceFile.text());

  if (!rows.length) {
    throw new Error("The uploaded maintenance sheet does not contain records.");
  }

  const assetTags = rows
    .map((row) => getCell(row, "assetTag", "asset_tag", "equipmentAssetTag"))
    .filter((value): value is string => Boolean(value));
  const equipmentRecords = assetTags.length
    ? await prisma.equipment.findMany({
        where: {
          assetTag: {
            in: [...new Set(assetTags)],
          },
        },
        select: {
          assetTag: true,
          id: true,
        },
      })
    : [];
  const equipmentByAssetTag = new Map(
    equipmentRecords.map((equipment) => [equipment.assetTag, equipment.id])
  );

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const equipmentId =
      getCell(row, "equipmentId", "equipment_id") ??
      equipmentByAssetTag.get(
        getCell(row, "assetTag", "asset_tag", "equipmentAssetTag") ?? ""
      );

    if (!equipmentId) {
      throw new Error(
        `Row ${rowNumber} must include a valid equipmentId or assetTag.`
      );
    }

    try {
      return maintenanceRecordSchema.parse({
        equipmentId,
        type: getCell(row, "type", "maintenanceType", "workType"),
        description: getCell(row, "description", "notes", "workNotes"),
        performedAt: getCell(row, "performedAt", "performed_at", "date"),
        nextDueDate: getCell(row, "nextDueDate", "next_due_date", "dueDate"),
        status:
          normaliseEnumCell(getCell(row, "status", "maintenanceStatus")) ??
          "COMPLETED",
      });
    } catch (error) {
      throw new Error(`Row ${rowNumber} contains invalid maintenance values.`, {
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
