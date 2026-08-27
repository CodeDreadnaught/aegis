"use server";

import { revalidatePath } from "next/cache";

import { importDefinitions } from "@/features/imports/definitions";
import {
  buildImportPreview,
  mapImportRows,
  parseImportFile,
  parseImportMapping,
  resolveImportMapping,
} from "@/features/imports/parser";
import {
  normaliseEnumCell,
  validateMaintenanceImportRow,
} from "@/features/imports/preview-validation";
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

  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    throw new Error("Upload a CSV or Excel maintenance import sheet.");
  }

  const maintenanceFile = file as File;

  if (!maintenanceFile.size) {
    throw new Error("Upload a CSV or Excel maintenance import sheet.");
  }

  const definition = importDefinitions.maintenance;
  const sheet = await parseImportFile(maintenanceFile);
  const mappings = parseImportMapping(
    formData.get("maintenanceImportFileMappings")
  );
  const resolvedMapping = resolveImportMapping(
    definition,
    sheet.headers,
    mappings
  );
  const preview = buildImportPreview(
    definition,
    sheet,
    mappings,
    validateMaintenanceImportRow
  );

  if (!sheet.rows.length) {
    throw new Error("The uploaded maintenance sheet does not contain records.");
  }

  if (resolvedMapping.missingRequired.length) {
    throw new Error(
      `Map required columns before importing: ${resolvedMapping.missingRequired.join(
        ", "
      )}.`
    );
  }

  if (preview.rowErrors.length) {
    throw new Error(formatImportRowErrors(preview.rowErrors));
  }

  const rows = mapImportRows(sheet.rows, resolvedMapping.mapping);
  const assetTags = rows
    .map((row) => row.assetTag?.trim())
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
      row.equipmentId?.trim() ??
      equipmentByAssetTag.get(row.assetTag?.trim() ?? "");

    if (!equipmentId) {
      throw new Error(
        `Row ${rowNumber} must include a valid equipmentId or assetTag.`
      );
    }

    try {
      return maintenanceRecordSchema.parse({
        equipmentId,
        type: row.type,
        description: row.description,
        performedAt: row.performedAt,
        nextDueDate: row.nextDueDate,
        status: normaliseEnumCell(row.status) ?? "COMPLETED",
      });
    } catch (error) {
      throw new Error(`Row ${rowNumber} contains invalid maintenance values.`, {
        cause: error,
      });
    }
  });
}

function formatImportRowErrors(
  errors: Array<{ message: string; rowNumber: number }>
) {
  const visibleErrors = errors
    .slice(0, 5)
    .map((error) => `Row ${error.rowNumber}: ${error.message}`)
    .join(" ");
  const remaining = errors.length > 5 ? ` ${errors.length - 5} more errors.` : "";

  return `${visibleErrors}${remaining}`;
}
