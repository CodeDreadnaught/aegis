import { describe, expect, it } from "vitest";

import {
  buildReadingParameters,
  formatSourceType,
  parseOperationalReadingForCategory,
  parseOperationalReadingRows,
} from "@/features/operational-readings/validation";
import type { EquipmentCategory } from "@/generated/prisma/enums";

const validReading = {
  equipmentId: "equipment_123",
  recordedAt: "2026-08-22T09:00",
  sourceType: "MANUAL_ENTRY",
  type: "M",
  airTemperatureKelvin: "299.4",
  processTemperatureKelvin: "309.2",
  rotationalSpeedRpm: "1420",
  torqueNm: "41.5",
  toolWearMinutes: "92",
  pressureBar: "52",
  vibrationMmS: "2.4",
  flowRateBpd: "1100",
  operatingHours: "120.5",
};

const staticCategories: EquipmentCategory[] = [
  "CHRISTMAS_TREE",
  "WELLHEAD",
  "PIPELINE",
  "STORAGE_TANK",
  "SEPARATOR",
  "HEAT_EXCHANGER",
];

describe("operational reading validation", () => {
  it("normalises valid AI4I and contextual parameters", () => {
    const input = parseOperationalReadingForCategory("PUMP", validReading);

    expect(input.recordedAt).toBeInstanceOf(Date);
    expect(input.airTemperatureKelvin).toBe(299.4);
    expect(buildReadingParameters(input)).toMatchObject({
      type: "M",
      torqueNm: 41.5,
      vibrationMmS: 2.4,
    });
  });

  it.each(staticCategories)(
    "allows zero RPM and torque for %s readings",
    (category) => {
      const input = parseOperationalReadingForCategory(category, {
        ...validReading,
        rotationalSpeedRpm: "0",
        torqueNm: "0",
        toolWearMinutes: "0",
      });

      expect(input.rotationalSpeedRpm).toBe(0);
      expect(input.torqueNm).toBe(0);
      expect(input.toolWearMinutes).toBe(0);
    }
  );

  it("keeps valid rotating equipment readings valid", () => {
    expect(() =>
      parseOperationalReadingForCategory("PUMP", validReading)
    ).not.toThrow();
    expect(() =>
      parseOperationalReadingForCategory("COMPRESSOR", validReading)
    ).not.toThrow();
    expect(() =>
      parseOperationalReadingForCategory("GENERATOR", {
        ...validReading,
        flowRateBpd: "",
      })
    ).not.toThrow();
  });

  it("rejects zero RPM for operating rotating equipment", () => {
    expect(() =>
      parseOperationalReadingForCategory("PUMP", {
        ...validReading,
        rotationalSpeedRpm: "0",
      })
    ).toThrow("Rotational speed must be greater than 0 for Pump readings.");
  });

  it("rejects negative rotating-machine telemetry", () => {
    expect(() =>
      parseOperationalReadingForCategory("PUMP", {
        ...validReading,
        rotationalSpeedRpm: "-500",
      })
    ).toThrow("Rotational speed cannot be negative.");
    expect(() =>
      parseOperationalReadingForCategory("COMPRESSOR", {
        ...validReading,
        torqueNm: "-1",
      })
    ).toThrow("Torque cannot be negative.");
  });

  it("rejects negative pressure when supplied", () => {
    expect(() =>
      parseOperationalReadingForCategory("PIPELINE", {
        ...validReading,
        rotationalSpeedRpm: "0",
        torqueNm: "0",
        pressureBar: "-20",
      })
    ).toThrow("Pressure cannot be negative.");
  });

  it("does not reject zero flow for pipeline readings", () => {
    const input = parseOperationalReadingForCategory("PIPELINE", {
      ...validReading,
      rotationalSpeedRpm: "0",
      torqueNm: "0",
      flowRateBpd: "0",
    });

    expect(input.flowRateBpd).toBe(0);
  });

  it("defaults omitted non-applicable AI features to zero for the fixed feature vector", () => {
    const input = parseOperationalReadingForCategory("CHRISTMAS_TREE", {
      ...validReading,
      rotationalSpeedRpm: "",
      torqueNm: "",
    });

    expect(buildReadingParameters(input)).toMatchObject({
      rotationalSpeedRpm: 0,
      torqueNm: 0,
    });
  });

  it("rejects invalid product type and negative contextual numbers", () => {
    expect(() =>
      parseOperationalReadingForCategory("PUMP", {
        ...validReading,
        pressureBar: "-1",
        type: "X",
      })
    ).toThrow();
  });

  it("formats source values for display", () => {
    expect(formatSourceType("SENSOR_IMPORT")).toBe("Sensor Import");
  });

  it("parses aligned manual reading rows for multiple equipment", () => {
    const formData = new FormData();
    formData.append("equipmentId", "equipment_1");
    formData.append("equipmentId", "equipment_2");
    formData.append("recordedAt", "2026-08-22T09:00");
    formData.append("recordedAt", "2026-08-22T09:05");
    formData.append("type", "M");
    formData.append("type", "L");
    formData.append("airTemperatureKelvin", "299.4");
    formData.append("airTemperatureKelvin", "301.2");
    formData.append("processTemperatureKelvin", "309.2");
    formData.append("processTemperatureKelvin", "311.8");
    formData.append("rotationalSpeedRpm", "1420");
    formData.append("rotationalSpeedRpm", "0");
    formData.append("torqueNm", "41.5");
    formData.append("torqueNm", "0");
    formData.append("toolWearMinutes", "92");
    formData.append("toolWearMinutes", "0");

    const rows = parseOperationalReadingRows(
      formData,
      new Map([
        ["equipment_1", "PUMP"],
        ["equipment_2", "CHRISTMAS_TREE"],
      ])
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      equipmentId: "equipment_1",
      sourceType: "MANUAL_ENTRY",
      type: "M",
    });
    expect(rows[1]).toMatchObject({
      equipmentId: "equipment_2",
      rotationalSpeedRpm: 0,
      sourceType: "MANUAL_ENTRY",
      torqueNm: 0,
      type: "L",
    });
  });
});