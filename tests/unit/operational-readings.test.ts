import { describe, expect, it } from "vitest";

import {
  buildReadingParameters,
  formatSourceType,
  operationalReadingSchema,
  parseOperationalReadingRows,
} from "@/features/operational-readings/validation";

describe("operational reading validation", () => {
  it("normalises valid AI4I and contextual parameters", () => {
    const input = operationalReadingSchema.parse({
      equipmentId: "equipment_123",
      recordedAt: "2026-08-22T09:00",
      sourceType: "MANUAL_ENTRY",
      type: "M",
      airTemperatureKelvin: "299.4",
      processTemperatureKelvin: "309.2",
      rotationalSpeedRpm: "1420",
      torqueNm: "41.5",
      toolWearMinutes: "92",
      pressureBar: "",
      vibrationMmS: "2.4",
      flowRateBpd: "1100",
      operatingHours: "120.5",
    });

    expect(input.recordedAt).toBeInstanceOf(Date);
    expect(input.airTemperatureKelvin).toBe(299.4);
    expect(input.pressureBar).toBeUndefined();
    expect(buildReadingParameters(input)).toMatchObject({
      type: "M",
      torqueNm: 41.5,
      vibrationMmS: 2.4,
    });
  });

  it("rejects invalid product type and negative contextual numbers", () => {
    expect(() =>
      operationalReadingSchema.parse({
        equipmentId: "equipment_123",
        recordedAt: "2026-08-22T09:00",
        sourceType: "MANUAL_ENTRY",
        type: "X",
        airTemperatureKelvin: "299.4",
        processTemperatureKelvin: "309.2",
        rotationalSpeedRpm: "1420",
        torqueNm: "41.5",
        toolWearMinutes: "92",
        pressureBar: "-1",
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
    formData.append("rotationalSpeedRpm", "1510");
    formData.append("torqueNm", "41.5");
    formData.append("torqueNm", "39.2");
    formData.append("toolWearMinutes", "92");
    formData.append("toolWearMinutes", "104");

    const rows = parseOperationalReadingRows(formData);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      equipmentId: "equipment_1",
      sourceType: "MANUAL_ENTRY",
      type: "M",
    });
    expect(rows[1]).toMatchObject({
      equipmentId: "equipment_2",
      sourceType: "MANUAL_ENTRY",
      type: "L",
    });
  });
});
