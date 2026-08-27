import { z } from "zod";

export const productTypes = ["H", "L", "M"] as const;

export const sourceTypes = ["MANUAL_ENTRY", "SENSOR_IMPORT"] as const;

const optionalNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().finite().nonnegative().optional()
);

const positiveNumber = z.coerce.number().finite().positive();

export const operationalReadingSchema = z.object({
  equipmentId: z.string().trim().min(1, "Equipment is required."),
  recordedAt: z.coerce.date(),
  sourceType: z.enum(sourceTypes).default("MANUAL_ENTRY"),
  type: z.enum(productTypes),
  airTemperatureKelvin: positiveNumber.min(250).max(400),
  processTemperatureKelvin: positiveNumber.min(250).max(450),
  rotationalSpeedRpm: positiveNumber.min(1).max(100000),
  torqueNm: positiveNumber.max(10000),
  toolWearMinutes: z.coerce.number().finite().nonnegative().max(100000),
  pressureBar: optionalNumber,
  vibrationMmS: optionalNumber,
  flowRateBpd: optionalNumber,
  operatingHours: optionalNumber,
});

export type OperationalReadingInput = z.infer<
  typeof operationalReadingSchema
>;

type OperationalReadingRowsFormData = {
  getAll(name: string): unknown[];
};

export function parseOperationalReadingRows(formData: OperationalReadingRowsFormData) {
  const equipmentIds = formData.getAll("equipmentId");

  return equipmentIds.map((_, index) =>
    operationalReadingSchema.parse({
      equipmentId: formData.getAll("equipmentId")[index],
      recordedAt: formData.getAll("recordedAt")[index],
      sourceType: "MANUAL_ENTRY",
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
    })
  );
}

export function buildReadingParameters(input: OperationalReadingInput) {
  return {
    type: input.type,
    airTemperatureKelvin: input.airTemperatureKelvin,
    processTemperatureKelvin: input.processTemperatureKelvin,
    rotationalSpeedRpm: input.rotationalSpeedRpm,
    torqueNm: input.torqueNm,
    toolWearMinutes: input.toolWearMinutes,
    pressureBar: input.pressureBar,
    vibrationMmS: input.vibrationMmS,
    flowRateBpd: input.flowRateBpd,
    operatingHours: input.operatingHours,
  };
}

export function formatSourceType(sourceType: string) {
  return sourceType
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}
