"use server";

import { revalidatePath } from "next/cache";

import { createPredictionsForReadings } from "@/features/analytics/prediction-service";
import { importDefinitions } from "@/features/imports/definitions";
import {
  buildImportPreview,
  mapImportRows,
  parseImportFile,
  parseImportMapping,
  resolveImportMapping,
} from "@/features/imports/parser";
import {
  validateOperationalReadingImportRow,
} from "@/features/imports/preview-validation";
import {
  buildReadingParameters,
  operationalReadingSchema,
  parseOperationalReadingRows,
} from "@/features/operational-readings/validation";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

export async function createOperationalReadingAction(formData: FormData) {
  const actor = await requirePermission("recordOperationalData");
  const sourceType = formData.get("sourceType") || "MANUAL_ENTRY";

  if (sourceType === "SENSOR_IMPORT") {
    const importedReadings = await parseSensorImport(formData);
    const readings = await prisma.$transaction(
      importedReadings.map((input) =>
        prisma.operationalReading.create({
          data: {
            equipmentId: input.equipmentId,
            recordedAt: input.recordedAt,
            sourceType: "SENSOR_IMPORT",
            createdById: actor.id,
            parameters: buildReadingParameters(input),
          },
          select: {
            id: true,
            equipmentId: true,
          },
        })
      )
    );

    await prisma.auditLog.createMany({
      data: readings.map((reading) => ({
        userId: actor.id,
        action: "IMPORT_OPERATIONAL_READINGS",
        entityType: "OperationalReading",
        entityId: reading.id,
        metadata: {
          equipmentId: reading.equipmentId,
          sourceType: "SENSOR_IMPORT",
        },
      })),
    });

    const predictionResults = await createPredictionsForReadings({
      actorId: actor.id,
      readingIds: readings.map((reading) => reading.id),
    });

    revalidatePath("/operational-data");
    revalidatePath("/analytics");
    revalidatePath("/overview");
    revalidatePath("/alerts");
    revalidatePath("/reports");
    for (const equipmentId of new Set(readings.map((reading) => reading.equipmentId))) {
      revalidatePath(`/equipment/${equipmentId}`);
    }

    return { count: readings.length, predictions: predictionResults };
  }

  const inputs = parseOperationalReadingRows(formData);

  if (!inputs.length) {
    throw new Error("Add at least one operational reading.");
  }

  const readings = await prisma.$transaction(
    inputs.map((input) =>
      prisma.operationalReading.create({
        data: {
          equipmentId: input.equipmentId,
          recordedAt: input.recordedAt,
          sourceType: input.sourceType,
          createdById: actor.id,
          parameters: buildReadingParameters(input),
        },
        select: {
          id: true,
          equipmentId: true,
        },
      })
    )
  );

  await prisma.auditLog.createMany({
    data: readings.map((reading) => ({
      userId: actor.id,
      action: "CREATE_OPERATIONAL_READING",
      entityType: "OperationalReading",
      entityId: reading.id,
      metadata: {
        equipmentId: reading.equipmentId,
        sourceType: "MANUAL_ENTRY",
      },
    })),
  });

  const predictionResults = await createPredictionsForReadings({
    actorId: actor.id,
    readingIds: readings.map((reading) => reading.id),
  });

  revalidatePath("/operational-data");
  revalidatePath("/analytics");
  revalidatePath("/overview");
  revalidatePath("/alerts");
  revalidatePath("/reports");
  for (const equipmentId of new Set(readings.map((reading) => reading.equipmentId))) {
    revalidatePath(`/equipment/${equipmentId}`);
  }

  return { count: readings.length, predictions: predictionResults };
}

async function parseSensorImport(formData: FormData) {
  const file = formData.get("sensorImportFile");
  const selectedEquipmentId =
    typeof formData.get("equipmentId") === "string"
      ? formData.get("equipmentId")?.toString().trim()
      : undefined;

  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    throw new Error("Upload a CSV or Excel sensor import sheet.");
  }

  const sensorFile = file as File;

  if (!sensorFile.size) {
    throw new Error("Upload a CSV or Excel sensor import sheet.");
  }

  const definition = importDefinitions.operationalReadings;
  const sheet = await parseImportFile(sensorFile);
  const mappings = parseImportMapping(formData.get("sensorImportFileMappings"));
  const resolvedMapping = resolveImportMapping(
    definition,
    sheet.headers,
    mappings
  );
  const preview = buildImportPreview(
    definition,
    sheet,
    mappings,
    validateOperationalReadingImportRow
  );

  if (!sheet.rows.length) {
    throw new Error("The uploaded sensor sheet does not contain readings.");
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
      equipmentByAssetTag.get(row.assetTag?.trim() ?? "") ??
      selectedEquipmentId;

    if (!equipmentId) {
      throw new Error(
        `Row ${rowNumber} must include a valid equipmentId or assetTag, or use a selected equipment item.`
      );
    }

    try {
      return operationalReadingSchema.parse({
        equipmentId,
        recordedAt: row.recordedAt,
        sourceType: "SENSOR_IMPORT",
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
      throw new Error(`Row ${rowNumber} contains invalid reading values.`, {
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
