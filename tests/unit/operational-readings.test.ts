import { describe, expect, it } from "vitest";

import {
  buildReadingParameters,
  formatSourceType,
  operationalReadingSchema,
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
});
