export type Ai4iFeatureParameters = {
  type?: unknown;
  airTemperatureKelvin?: unknown;
  processTemperatureKelvin?: unknown;
  rotationalSpeedRpm?: unknown;
  torqueNm?: unknown;
  toolWearMinutes?: unknown;
};

export const ai4iFeatureOrder = [
  "type_H",
  "type_L",
  "type_M",
  "air_temperature_k",
  "process_temperature_k",
  "rotational_speed_rpm",
  "torque_nm",
  "tool_wear_min",
] as const;

export function buildAi4iFeatureVector(parameters: unknown) {
  const values = asFeatureParameters(parameters);
  const productType = String(values.type ?? "").toUpperCase();

  if (!["H", "L", "M"].includes(productType)) {
    throw new Error("Operational reading is missing a valid AI4I product type.");
  }

  return {
    vector: [
      productType === "H" ? 1 : 0,
      productType === "L" ? 1 : 0,
      productType === "M" ? 1 : 0,
      requiredNumber(values.airTemperatureKelvin, "air temperature"),
      requiredNumber(values.processTemperatureKelvin, "process temperature"),
      requiredNumber(values.rotationalSpeedRpm, "rotational speed"),
      requiredNumber(values.torqueNm, "torque"),
      requiredNumber(values.toolWearMinutes, "tool wear"),
    ],
    snapshot: {
      featureOrder: ai4iFeatureOrder,
      type: productType,
      airTemperatureKelvin: requiredNumber(
        values.airTemperatureKelvin,
        "air temperature"
      ),
      processTemperatureKelvin: requiredNumber(
        values.processTemperatureKelvin,
        "process temperature"
      ),
      rotationalSpeedRpm: requiredNumber(
        values.rotationalSpeedRpm,
        "rotational speed"
      ),
      torqueNm: requiredNumber(values.torqueNm, "torque"),
      toolWearMinutes: requiredNumber(values.toolWearMinutes, "tool wear"),
    },
  };
}

export function abnormalAi4iParameters(parameters: unknown) {
  const values = asFeatureParameters(parameters);
  const abnormal: string[] = [];
  const torque = optionalNumber(values.torqueNm);
  const toolWear = optionalNumber(values.toolWearMinutes);
  const rotationalSpeed = optionalNumber(values.rotationalSpeedRpm);

  if (torque !== null && torque >= 60) {
    abnormal.push("Torque");
  }

  if (toolWear !== null && toolWear >= 200) {
    abnormal.push("Tool wear");
  }

  if (rotationalSpeed !== null && rotationalSpeed < 1200) {
    abnormal.push("Rotational speed");
  }

  return abnormal;
}

function asFeatureParameters(value: unknown): Ai4iFeatureParameters {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Operational reading parameters are not available.");
  }

  return value as Ai4iFeatureParameters;
}

function requiredNumber(value: unknown, label: string) {
  const parsed = optionalNumber(value);

  if (parsed === null) {
    throw new Error(`Operational reading is missing ${label}.`);
  }

  return parsed;
}

function optionalNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}
