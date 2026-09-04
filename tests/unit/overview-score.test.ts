import { describe, expect, it } from "vitest";

import { calculateAiReadinessScore, percentage } from "@/features/overview/score";

describe("overview score helpers", () => {
  it("calculates prediction coverage as a percentage of the full fleet", () => {
    expect(percentage(2, 100)).toBe(2);
    expect(percentage(100, 100)).toBe(100);
  });

  it("bases AI readiness on fleet coverage, run volume, and recent readings", () => {
    expect(
      calculateAiReadinessScore({
        equipmentCount: 100,
        hasRecentReadings: true,
        predictedAssetCoverage: 2,
        predictionRunCount: 8,
      })
    ).toBe(13);
  });

  it("returns zero when there are no predictions for the selected range", () => {
    expect(
      calculateAiReadinessScore({
        equipmentCount: 100,
        hasRecentReadings: true,
        predictedAssetCoverage: 0,
        predictionRunCount: 0,
      })
    ).toBe(0);
  });
});
