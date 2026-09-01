import { riskThresholds } from "@/features/analytics/domain/thresholds";

export type RiskLevel = "Low" | "Medium" | "High";

type Thresholds = {
  lower: number;
  upper: number;
};

const parameterInsights: Record<string, string> = {
  "Rotational speed":
    "Rotational speed is below the expected operating band, which can indicate drag, slipping, or poor speed control under load",
  Torque:
    "Torque is elevated against the expected load profile, pointing to excess mechanical resistance or process load",
  "Tool wear":
    "Tool wear is advanced enough to reduce operating margin and increase the chance of degraded performance",
};

const parameterActions: Record<string, string> = {
  "Rotational speed":
    "verify drive speed control, check for binding, and compare the next reading before continued high-load operation",
  Torque:
    "inspect load path, coupling condition, and process resistance before the asset is returned to sustained duty",
  "Tool wear":
    "schedule tool inspection or replacement and confirm wear-related operating limits with maintenance history",
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
  const relevantParameters = abnormalParameters.length
    ? abnormalParameters.join(", ")
    : "No static parameter threshold breach was isolated; review the full reading trend.";
  const reason = buildReason({
    abnormalParameters,
    failureProbability,
    healthScore,
    probability,
    riskLevel,
  });
  const recommendation = buildAction(riskLevel, abnormalParameters);

  return `Risk: ${riskLevel}. Reason: ${reason} Relevant parameters requiring review: ${relevantParameters}. Recommendation: ${recommendation}`;
}

function buildReason({
  abnormalParameters,
  failureProbability,
  healthScore,
  probability,
  riskLevel,
}: {
  abnormalParameters: string[];
  failureProbability: number;
  healthScore: number;
  probability: string;
  riskLevel: RiskLevel;
}) {
  const primaryInsight = abnormalParameters
    .map(parameter => parameterInsights[parameter])
    .find(Boolean);
  const pressure = describeRiskPressure(riskLevel, failureProbability);

  if (primaryInsight) {
    return `${pressure}; estimated failure probability is ${probability} and AEGIS health score is ${healthScore}%. ${primaryInsight}.`;
  }

  return `${pressure}; estimated failure probability is ${probability} and AEGIS health score is ${healthScore}%. No single threshold driver was isolated, so the model result should be compared with recent operating history.`;
}

function buildAction(riskLevel: RiskLevel, abnormalParameters: string[]) {
  const primaryAction = abnormalParameters
    .map(parameter => parameterActions[parameter])
    .find(Boolean);

  if (riskLevel === "High") {
    return primaryAction
      ? `Prioritise inspection: ${primaryAction}.`
      : "Prioritise inspection and validate the latest telemetry against recent trend, maintenance history, and operating context.";
  }

  if (riskLevel === "Medium") {
    return primaryAction
      ? `Schedule maintenance review: ${primaryAction}.`
      : "Schedule maintenance review and keep the asset under closer monitoring until the next stable reading.";
  }

  return primaryAction
    ? `Continue routine monitoring, with attention to this factor: ${primaryAction}.`
    : "Continue routine monitoring and planned maintenance.";
}

function describeRiskPressure(riskLevel: RiskLevel, failureProbability: number) {
  if (riskLevel === "High" && failureProbability >= 0.85) {
    return "Critical model pressure is present";
  }

  if (riskLevel === "High") {
    return "High model pressure is present";
  }

  if (riskLevel === "Medium") {
    return "Moderate model pressure is present";
  }

  return "Low model pressure is present";
}