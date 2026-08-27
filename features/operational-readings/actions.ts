"use server";

import { revalidatePath } from "next/cache";

import { createPredictionsForReadings } from "@/features/analytics/prediction-service";
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

  if (!file || typeof file !== "object" || !("text" in file)) {
    throw new Error("Upload a CSV sensor import sheet.");
  }

  const sensorFile = file as File;

  if (!sensorFile.size) {
    throw new Error("Upload a CSV sensor import sheet.");
  }

  const rows = parseCsv(await sensorFile.text());

  if (!rows.length) {
    throw new Error("The uploaded sensor sheet does not contain readings.");
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
      ) ??
      selectedEquipmentId;

    if (!equipmentId) {
      throw new Error(
        `Row ${rowNumber} must include a valid equipmentId or assetTag, or use a selected equipment item.`
      );
    }

    try {
      return operationalReadingSchema.parse({
        equipmentId,
        recordedAt: getCell(row, "recordedAt", "recorded_at", "timestamp"),
        sourceType: "SENSOR_IMPORT",
        type: getCell(row, "type", "productType", "product_type") ?? "M",
        airTemperatureKelvin: getCell(
          row,
          "airTemperatureKelvin",
          "air_temperature_k",
          "air_temperature_kelvin"
        ),
        processTemperatureKelvin: getCell(
          row,
          "processTemperatureKelvin",
          "process_temperature_k",
          "process_temperature_kelvin"
        ),
        rotationalSpeedRpm: getCell(
          row,
          "rotationalSpeedRpm",
          "rotational_speed_rpm"
        ),
        torqueNm: getCell(row, "torqueNm", "torque_nm"),
        toolWearMinutes: getCell(row, "toolWearMinutes", "tool_wear_minutes"),
        pressureBar: getCell(row, "pressureBar", "pressure_bar"),
        vibrationMmS: getCell(row, "vibrationMmS", "vibration_mm_s"),
        flowRateBpd: getCell(row, "flowRateBpd", "flow_rate_bpd"),
        operatingHours: getCell(row, "operatingHours", "operating_hours"),
      });
    } catch (error) {
      throw new Error(`Row ${rowNumber} contains invalid reading values.`, {
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
