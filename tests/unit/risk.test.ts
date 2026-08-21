import { describe, expect, it } from "vitest";

import {
  buildRecommendation,
  calculateHealthScore,
  classifyRisk,
} from "@/features/analytics/domain/risk";

describe("AEGIS risk domain", () => {
  it("calculates bounded health scores from failure probability", () => {
    expect(calculateHealthScore(0)).toBe(100);
    expect(calculateHealthScore(0.42)).toBe(58);
    expect(calculateHealthScore(1)).toBe(0);
    expect(calculateHealthScore(-0.5)).toBe(100);
    expect(calculateHealthScore(1.5)).toBe(0);
  });

  it("classifies risk at threshold boundaries", () => {
    const thresholds = { lower: 0.35, upper: 0.7 };

    expect(classifyRisk(0.349, thresholds)).toBe("Low");
    expect(classifyRisk(0.35, thresholds)).toBe("Medium");
    expect(classifyRisk(0.699, thresholds)).toBe("Medium");
    expect(classifyRisk(0.7, thresholds)).toBe("High");
  });

  it("generates deterministic advisory recommendations", () => {
    const recommendation = buildRecommendation({
      riskLevel: "High",
      failureProbability: 0.82,
      healthScore: 18,
      abnormalParameters: ["Torque", "Tool wear"],
    });

    expect(recommendation).toContain("Risk: High");
    expect(recommendation).toContain("Torque, Tool wear");
    expect(recommendation).toContain("Prioritise inspection");
    expect(recommendation).not.toContain("shut down");
  });
});
