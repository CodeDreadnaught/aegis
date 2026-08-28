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
  formatOperationalReadingValidationError,
  parseOperationalReadingForCategory,
  parseOperationalReadingRows,
  type OperationalReadingInput,
} from "@/features/operational-readings/validation";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

type OperationalReadingImportMode = "LIVE_IMPORT" | "HISTORICAL_IMPORT";

type CreatedOperationalReading = {
  equipmentId: string;
  id: string;
  sourceType: string;
};

export async function createOperationalReadingAction(formData: FormData) {
  const actor = await requirePermission("recordOperationalData");
  const sourceType = formData.get("sourceType") || "MANUAL_ENTRY";

  if (sourceType === "SENSOR_IMPORT") {
    const importMode = parseImportMode(formData);
    const importedReadings = await parseSensorImport(formData);
    const { readings, skippedDuplicates } = await createUniqueOperationalReadings({
      actorId: actor.id,
      inputs: importedReadings,
      predictionEligible: importMode === "LIVE_IMPORT",
    });

    await createOperationalReadingAuditLogs({
      action: "IMPORT_OPERATIONAL_READINGS",
      actorId: actor.id,
      importMode,
      readings,
    });

    const predictionResults =
      importMode === "LIVE_IMPORT"
        ? await createPredictionsForReadings({
            actorId: actor.id,
            readingIds: readings.map((reading) => reading.id),
          })
        : undefined;

    revalidateOperationalReadingPaths(readings.map((reading) => reading.equipmentId));

    return {
      count: readings.length,
      importMode,
      predictions: predictionResults,
      processed: importedReadings.length,
      skippedDuplicates,
    };
  }

  const categoriesByEquipmentId = await getCategoriesForFormReadings(formData);
  const inputs = parseOperationalReadingRows(formData, categoriesByEquipmentId);

  if (!inputs.length) {
    throw new Error("Add at least one operational reading.");
  }

  const { readings, skippedDuplicates } = await createUniqueOperationalReadings({
    actorId: actor.id,
    inputs,
    predictionEligible: true,
  });

  await createOperationalReadingAuditLogs({
    action: "CREATE_OPERATIONAL_READING",
    actorId: actor.id,
    importMode: "LIVE_IMPORT",
    readings,
  });

  const predictionResults = await createPredictionsForReadings({
    actorId: actor.id,
    readingIds: readings.map((reading) => reading.id),
  });

  revalidateOperationalReadingPaths(readings.map((reading) => reading.equipmentId));

  return {
    count: readings.length,
    importMode: "LIVE_IMPORT",
    predictions: predictionResults,
    processed: inputs.length,
    skippedDuplicates,
  };
}

async function parseSensorImport(formData: FormData) {
  const file = formData.get("sensorImportFile");

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
  const equipmentByReference = await getEquipmentForSensorImportRows(rows);

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const explicitEquipmentId = row.equipmentId?.trim();
    const assetTag = row.assetTag?.trim();
    const equipment = explicitEquipmentId
      ? equipmentByReference.byId.get(explicitEquipmentId)
      : assetTag
        ? equipmentByReference.byAssetTag.get(assetTag)
        : undefined;

    if (!equipment) {
      throw new Error(
        `Row ${rowNumber} must include a valid equipmentId or assetTag.`
      );
    }

    try {
      return parseOperationalReadingForCategory(equipment.category, {
        equipmentId: equipment.id,
        recordedAt: row.recordedAt,
        sourceType: row.sourceType?.trim() || "SENSOR_IMPORT",
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
      throw new Error(
        `Row ${rowNumber} - ${formatOperationalReadingValidationError(error)}`
      );
    }
  });
}

async function createUniqueOperationalReadings({
  actorId,
  inputs,
  predictionEligible,
}: {
  actorId: string;
  inputs: OperationalReadingInput[];
  predictionEligible: boolean;
}) {
  const existingKeys = await getExistingOperationalReadingKeys(inputs);
  const seenKeys = new Set(existingKeys);
  const data = [];

  for (const input of inputs) {
    const key = operationalReadingKey(input.equipmentId, input.recordedAt);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    data.push({
      equipmentId: input.equipmentId,
      recordedAt: input.recordedAt,
      sourceType: input.sourceType,
      predictionEligible,
      createdById: actorId,
      parameters: buildReadingParameters(input),
    });
  }

  const readings = data.length
    ? await prisma.operationalReading.createManyAndReturn({
        data,
        skipDuplicates: true,
        select: {
          id: true,
          equipmentId: true,
          sourceType: true,
        },
      })
    : [];

  return {
    readings,
    skippedDuplicates: inputs.length - readings.length,
  };
}

async function getExistingOperationalReadingKeys(inputs: OperationalReadingInput[]) {
  const equipmentIds = [...new Set(inputs.map((input) => input.equipmentId))];
  const recordedAts = [
    ...new Set(inputs.map((input) => input.recordedAt.getTime())),
  ].map((timestamp) => new Date(timestamp));

  if (!equipmentIds.length || !recordedAts.length) {
    return [];
  }

  const existingReadings = await prisma.operationalReading.findMany({
    where: {
      equipmentId: {
        in: equipmentIds,
      },
      recordedAt: {
        in: recordedAts,
      },
    },
    select: {
      equipmentId: true,
      recordedAt: true,
    },
  });

  return existingReadings.map((reading) =>
    operationalReadingKey(reading.equipmentId, reading.recordedAt)
  );
}

async function createOperationalReadingAuditLogs({
  action,
  actorId,
  importMode,
  readings,
}: {
  action: "CREATE_OPERATIONAL_READING" | "IMPORT_OPERATIONAL_READINGS";
  actorId: string;
  importMode: OperationalReadingImportMode;
  readings: CreatedOperationalReading[];
}) {
  if (!readings.length) {
    return;
  }

  await prisma.auditLog.createMany({
    data: readings.map((reading) => ({
      userId: actorId,
      action,
      entityType: "OperationalReading",
      entityId: reading.id,
      metadata: {
        equipmentId: reading.equipmentId,
        importMode,
        sourceType: reading.sourceType,
      },
    })),
  });
}

async function getCategoriesForFormReadings(formData: FormData) {
  const equipmentIds = [
    ...new Set(
      formData
        .getAll("equipmentId")
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
  const equipment = await prisma.equipment.findMany({
    where: {
      id: {
        in: equipmentIds,
      },
    },
    select: {
      category: true,
      id: true,
    },
  });

  return new Map(equipment.map((item) => [item.id, item.category]));
}

async function getEquipmentForSensorImportRows(rows: Array<Record<string, string>>) {
  const equipmentIds = rows
    .map((row) => row.equipmentId?.trim())
    .filter((value): value is string => Boolean(value));
  const assetTags = rows
    .map((row) => row.assetTag?.trim())
    .filter((value): value is string => Boolean(value));
  if (!equipmentIds.length && !assetTags.length) {
    return {
      byAssetTag: new Map<string, { assetTag: string; category: import("@/generated/prisma/enums").EquipmentCategory; id: string }>(),
      byId: new Map<string, { assetTag: string; category: import("@/generated/prisma/enums").EquipmentCategory; id: string }>(),
    };
  }

  const equipmentRecords = await prisma.equipment.findMany({
    where: {
      OR: [
        equipmentIds.length
          ? {
              id: {
                in: [...new Set(equipmentIds)],
              },
            }
          : undefined,
        assetTags.length
          ? {
              assetTag: {
                in: [...new Set(assetTags)],
              },
            }
          : undefined,
      ].filter(Boolean) as Array<
        | { id: { in: string[] } }
        | { assetTag: { in: string[] } }
      >,
    },
    select: {
      assetTag: true,
      category: true,
      id: true,
    },
  });

  return {
    byAssetTag: new Map(
      equipmentRecords.map((equipment) => [equipment.assetTag, equipment])
    ),
    byId: new Map(equipmentRecords.map((equipment) => [equipment.id, equipment])),
  };
}

function parseImportMode(formData: FormData): OperationalReadingImportMode {
  return formData.get("importMode") === "HISTORICAL_IMPORT"
    ? "HISTORICAL_IMPORT"
    : "LIVE_IMPORT";
}

function operationalReadingKey(equipmentId: string, recordedAt: Date) {
  return `${equipmentId}:${recordedAt.toISOString()}`;
}

function revalidateOperationalReadingPaths(equipmentIds: string[]) {
  revalidatePath("/operational-data");
  revalidatePath("/analytics");
  revalidatePath("/overview");
  revalidatePath("/alerts");
  revalidatePath("/reports");
  for (const equipmentId of new Set(equipmentIds)) {
    revalidatePath(`/equipment/${equipmentId}`);
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