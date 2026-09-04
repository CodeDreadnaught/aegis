import { describe, expect, it } from "vitest";

import {
  abnormalAi4iParameters,
  buildAi4iFeatureVector,
} from "@/features/analytics/features";

describe("analytics feature mapping", () => {
  it("maps operational reading parameters into the AI4I feature order", () => {
    const result = buildAi4iFeatureVector({
      type: "M",
      airTemperatureKelvin: 300,
      processTemperatureKelvin: 310,
      rotationalSpeedRpm: 1450,
      torqueNm: 42,
      toolWearMinutes: 90,
    });

    expect(result.vector).toEqual([0, 0, 1, 300, 310, 1450, 42, 90]);
    expect(result.snapshot.featureOrder).toContain("rotational_speed_rpm");
  });

  it("rejects readings missing required model features", () => {
    expect(() => buildAi4iFeatureVector({ type: "M" })).toThrow(
      /air temperature/
    );
  });

  it("identifies abnormal explanatory parameters", () => {
    expect(
      abnormalAi4iParameters({
        rotationalSpeedRpm: 1000,
        torqueNm: 65,
        toolWearMinutes: 220,
      })
    ).toEqual(["Torque", "Tool wear", "Rotational speed"]);
  });
});
