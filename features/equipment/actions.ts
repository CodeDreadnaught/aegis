"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createPredictionsForReadings } from "@/features/analytics/prediction-service";
import { equipmentSchema } from "@/features/equipment/validation";
import {
  buildReadingParameters,
  operationalReadingSchema,
} from "@/features/operational-readings/validation";
import { importDefinitions } from "@/features/imports/definitions";
import {
  buildImportPreview,
  mapImportRows,
  parseImportFile,
  parseImportMapping,
  resolveImportMapping,
} from "@/features/imports/parser";
import {
  hasInitialReadingValues,
  normaliseEnumCell,
  validateEquipmentImportRow,
} from "@/features/imports/preview-validation";
import type { Prisma } from "@/generated/prisma/client";
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
  const readingEnabledRows = new Set(
    formData.getAll("initialReadingEnabled").map(String)
  );

  return assetTags.map((_, index) => {
    const rowId = String(formData.getAll("equipmentRowId")[index] ?? index);

    return {
      equipment: equipmentSchema.parse({
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
      }),
      initialReading: readingEnabledRows.has(rowId)
        ? parseInitialReadingFormRow(formData, index, "MANUAL_ENTRY")
        : undefined,
    };
  });
}

export async function createEquipmentAction(formData: FormData) {
  const actor = await requirePermission("createEquipment");
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
        data: input.equipment,
        select: { id: true },
      })
    )
  );
  const readingsToCreate = inputs.flatMap((input, index) =>
    input.initialReading
      ? [
          {
            equipmentId: equipment[index].id,
            input: input.initialReading,
          },
        ]
      : []
  );

  const readings = readingsToCreate.length
    ? await prisma.$transaction(
        readingsToCreate.map((reading) =>
          prisma.operationalReading.create({
            data: {
              equipmentId: reading.equipmentId,
              recordedAt: reading.input.recordedAt,
              sourceType: reading.input.sourceType,
              createdById: actor.id,
              parameters: buildReadingParameters(reading.input),
            },
            select: {
              equipmentId: true,
              id: true,
            },
          })
        )
      )
    : [];

  if (readings.length) {
    await prisma.auditLog.createMany({
      data: readings.map((reading) => ({
        userId: actor.id,
        action:
          registrationMode === "sheet"
            ? "IMPORT_OPERATIONAL_READINGS"
            : "CREATE_OPERATIONAL_READING",
        entityType: "OperationalReading",
        entityId: reading.id,
        metadata: {
          equipmentId: reading.equipmentId,
          sourceType: registrationMode === "sheet" ? "SENSOR_IMPORT" : "MANUAL_ENTRY",
        },
      })),
    });

    await createPredictionsForReadings({
      actorId: actor.id,
      readingIds: readings.map((reading) => reading.id),
    });
  }

  revalidatePath("/equipment");
  revalidatePath("/overview");
  revalidatePath("/operational-data");
  revalidatePath("/analytics");
  revalidatePath("/alerts");
  revalidatePath("/reports");

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

export async function deleteEquipmentAction(id: string) {
  const actor = await requirePermission("deleteEquipment");

  await deleteEquipmentWithDependencies(id, actor.id);

  revalidatePath("/equipment");
  revalidatePath("/overview");
  revalidatePath("/operational-data");
  revalidatePath("/maintenance");
  revalidatePath("/analytics");
  revalidatePath("/alerts");
  revalidatePath("/reports");
  redirect("/equipment?toast=equipment-deleted");
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

export async function deleteEquipmentWithDependencies(
  id: string,
  actorId: string | null = null
) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    select: {
      assetTag: true,
      id: true,
      name: true,
    },
  });

  if (!equipment) {
    throw new Error("Equipment was not found.");
  }

  const [readings, predictions, alerts, maintenanceRecords] = await Promise.all([
    prisma.operationalReading.findMany({
      where: { equipmentId: id },
      select: { id: true },
    }),
    prisma.prediction.findMany({
      where: { equipmentId: id },
      select: { id: true },
    }),
    prisma.alert.findMany({
      where: { equipmentId: id },
      select: { id: true },
    }),
    prisma.maintenanceRecord.findMany({
      where: { equipmentId: id },
      select: { id: true },
    }),
  ]);

  const readingIds = readings.map((reading) => reading.id);
  const predictionIds = predictions.map((prediction) => prediction.id);
  const entityIds = [
    id,
    ...readingIds,
    ...predictionIds,
    ...alerts.map((alert) => alert.id),
    ...maintenanceRecords.map((record) => record.id),
  ];

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.auditLog.deleteMany({
      where: {
        entityId: {
          in: entityIds,
        },
      },
    }),
  ];

  if (predictionIds.length) {
    operations.push(
      prisma.recommendation.deleteMany({
        where: {
          predictionId: {
            in: predictionIds,
          },
        },
      })
    );
  }

  if (alerts.length || predictionIds.length) {
    operations.push(
      prisma.alert.deleteMany({
        where: {
          OR: [
            { equipmentId: id },
            {
              predictionId: {
                in: predictionIds,
              },
            },
          ],
        },
      })
    );
  }

  if (readingIds.length) {
    operations.push(
      prisma.predictionJob.deleteMany({
        where: {
          operationalReadingId: {
            in: readingIds,
          },
        },
      })
    );
  }

  if (predictionIds.length || readingIds.length) {
    operations.push(
      prisma.prediction.deleteMany({
        where: {
          OR: [
            { equipmentId: id },
            {
              operationalReadingId: {
                in: readingIds,
              },
            },
          ],
        },
      })
    );
  }

  if (readingIds.length) {
    operations.push(
      prisma.operationalReading.deleteMany({
        where: { equipmentId: id },
      })
    );
  }

  if (maintenanceRecords.length) {
    operations.push(
      prisma.maintenanceRecord.deleteMany({
        where: { equipmentId: id },
      })
    );
  }

  operations.push(
    prisma.equipment.delete({
      where: { id },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "DELETE_EQUIPMENT",
        entityType: "Equipment",
        entityId: id,
        metadata: {
          assetTag: equipment.assetTag,
          name: equipment.name,
        },
      },
    })
  );

  await prisma.$transaction(operations);
}

async function parseEquipmentImport(formData: FormData) {
  const file = formData.get("equipmentImportFile");

  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    throw new Error("Upload a CSV or Excel equipment register sheet.");
  }

  const equipmentFile = file as File;

  if (!equipmentFile.size) {
    throw new Error("Upload a CSV or Excel equipment register sheet.");
  }

  const definition = importDefinitions.equipment;
  const sheet = await parseImportFile(equipmentFile);
  const mappings = parseImportMapping(formData.get("equipmentImportFileMappings"));
  const resolvedMapping = resolveImportMapping(
    definition,
    sheet.headers,
    mappings
  );
  const preview = buildImportPreview(
    definition,
    sheet,
    mappings,
    validateEquipmentImportRow
  );

  if (!sheet.rows.length) {
    throw new Error("The uploaded asset import file does not contain records.");
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

  return mapImportRows(sheet.rows, resolvedMapping.mapping).map((row, index) => {
    const rowNumber = index + 2;

    let equipment;

    try {
      equipment = equipmentSchema.parse({
        assetTag: row.assetTag,
        name: row.name,
        category: normaliseEnumCell(row.category),
        status: normaliseEnumCell(row.status) ?? "ACTIVE",
        location: row.location,
        manufacturer: row.manufacturer,
        model: row.model,
        serialNumber: row.serialNumber,
        installationDate: row.installationDate,
        description: row.description,
      });
    } catch (error) {
      throw new Error(`Row ${rowNumber} contains invalid equipment values.`, {
        cause: error,
      });
    }

    return {
      equipment,
      initialReading: hasInitialReadingValues(row)
        ? parseInitialReadingCsvRow(row, rowNumber, "SENSOR_IMPORT")
        : undefined,
    };
  });
}

function parseInitialReadingFormRow(
  formData: FormData,
  index: number,
  sourceType: "MANUAL_ENTRY" | "SENSOR_IMPORT"
) {
  return operationalReadingSchema.parse({
    equipmentId: "pending-registration",
    recordedAt: formData.getAll("recordedAt")[index] || new Date(),
    sourceType,
    type: formData.getAll("type")[index],
    airTemperatureKelvin: formData.getAll("airTemperatureKelvin")[index],
    processTemperatureKelvin: formData.getAll("processTemperatureKelvin")[index],
    rotationalSpeedRpm: formData.getAll("rotationalSpeedRpm")[index],
    torqueNm: formData.getAll("torqueNm")[index],
    toolWearMinutes: formData.getAll("toolWearMinutes")[index],
    pressureBar: formData.getAll("pressureBar")[index],
    vibrationMmS: formData.getAll("vibrationMmS")[index],
    flowRateBpd: formData.getAll("flowRateBpd")[index],
    operatingHours: formData.getAll("operatingHours")[index],
  });
}

function parseInitialReadingCsvRow(
  row: Record<string, string>,
  rowNumber: number,
  sourceType: "MANUAL_ENTRY" | "SENSOR_IMPORT"
) {
  try {
    return operationalReadingSchema.parse({
      equipmentId: "pending-registration",
      recordedAt: row.recordedAt || new Date(),
      sourceType,
      type: row.type || "M",
      airTemperatureKelvin: row.airTemperatureKelvin,
      processTemperatureKelvin: row.processTemperatureKelvin,
      rotationalSpeedRpm: row.rotationalSpeedRpm,
      torqueNm: row.torqueNm,
      toolWearMinutes: row.toolWearMinutes,
      pressureBar: row.pressureBar,
      vibrationMmS: row.vibrationMmS,
      flowRateBpd: row.flowRateBpd,
      operatingHours: row.operatingHours,
    });
  } catch (error) {
    throw new Error(`Row ${rowNumber} contains invalid initial reading values.`, {
      cause: error,
    });
  }
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
