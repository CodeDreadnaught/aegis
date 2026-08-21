import { riskThresholds } from "@/features/analytics/domain/thresholds";

export type RiskLevel = "Low" | "Medium" | "High";

type Thresholds = {
  lower: number;
  upper: number;
};

export function calculateHealthScore(failureProbability: number) {
  if (!Number.isFinite(failureProbability)) {
    throw new Error("Failure probability must be finite.");
  }

  const boundedProbability = Math.min(Math.max(failureProbability, 0), 1);

  return Number((100 * (1 - boundedProbability)).toFixed(2));
}

export function classifyRisk(
  failureProbability: number,
  thresholds: Thresholds = riskThresholds
): RiskLevel {
  if (thresholds.lower >= thresholds.upper) {
    throw new Error("Lower risk threshold must be below upper threshold.");
  }

  if (failureProbability < thresholds.lower) {
    return "Low";
  }

  if (failureProbability < thresholds.upper) {
    return "Medium";
  }

  return "High";
}

export function buildRecommendation({
  riskLevel,
  failureProbability,
  healthScore,
  abnormalParameters = [],
}: {
  riskLevel: RiskLevel;
  failureProbability: number;
  healthScore: number;
  abnormalParameters?: string[];
}) {
  const probability = `${Math.round(failureProbability * 100)}%`;
  const factors = abnormalParameters.length
    ? ` Relevant parameters requiring review: ${abnormalParameters.join(", ")}.`
    : "";

  if (riskLevel === "High") {
    return `Risk: High. Reason: Estimated failure probability is ${probability}, giving an AEGIS health score of ${healthScore}%.${factors} Recommendation: Prioritise inspection and review the identified condition before continued operation according to established maintenance procedures.`;
  }

  if (riskLevel === "Medium") {
    return `Risk: Medium. Reason: Estimated failure probability is ${probability}, giving an AEGIS health score of ${healthScore}%.${factors} Recommendation: Schedule maintenance review and continue monitoring operational readings.`;
  }

  return `Risk: Low. Reason: Estimated failure probability is ${probability}, giving an AEGIS health score of ${healthScore}%.${factors} Recommendation: Continue routine monitoring and planned maintenance.`;
}
