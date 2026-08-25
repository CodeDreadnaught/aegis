"use server";

import { revalidatePath } from "next/cache";

import {
  abnormalAi4iParameters,
  buildAi4iFeatureVector,
} from "@/features/analytics/features";
import {
  buildRecommendation,
  calculateHealthScore,
  classifyRisk,
} from "@/features/analytics/domain/risk";
import { riskThresholds } from "@/features/analytics/domain/thresholds";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { runAegisInference } from "@/server/ml/aegis-inference";
import metadata from "@/models/ai4i/v1/metadata.json";

const riskLevelMap = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;

export async function runPredictionAction(readingId: string) {
  const actor = await requirePermission("runPrediction");

  const reading = await prisma.operationalReading.findUnique({
    where: { id: readingId },
    select: {
      id: true,
      equipmentId: true,
      parameters: true,
    },
  });

  if (!reading) {
    throw new Error("Operational reading was not found.");
  }

  const { snapshot, vector } = buildAi4iFeatureVector(reading.parameters);
  const { failureProbability } = await runAegisInference(vector);
  const healthScore = calculateHealthScore(failureProbability);
  const riskLevel = classifyRisk(failureProbability, riskThresholds);
  const persistedRiskLevel = riskLevelMap[riskLevel];
  const recommendation = buildRecommendation({
    riskLevel,
    failureProbability,
    healthScore,
    abnormalParameters: abnormalAi4iParameters(reading.parameters),
  });

  const prediction = await prisma.prediction.create({
    data: {
      equipmentId: reading.equipmentId,
      operationalReadingId: reading.id,
      failureProbability,
      healthScore,
      riskLevel: persistedRiskLevel,
      modelVersion: metadata.model_version,
      thresholdVersion: riskThresholds.version,
      featureSnapshot: snapshot,
      createdById: actor.id,
      recommendations: {
        create: {
          message: recommendation,
          priority: persistedRiskLevel,
          explanationFactors: {
            abnormalParameters: abnormalAi4iParameters(reading.parameters),
          },
        },
      },
      alerts:
        persistedRiskLevel === "HIGH"
          ? {
              create: {
                equipmentId: reading.equipmentId,
                type: "PREDICTION_RISK",
                severity: "HIGH",
                message: recommendation,
              },
            }
          : undefined,
    },
    select: {
      id: true,
      equipmentId: true,
      riskLevel: true,
      failureProbability: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "RUN_PREDICTION",
      entityType: "Prediction",
      entityId: prediction.id,
      metadata: {
        equipmentId: prediction.equipmentId,
        riskLevel: prediction.riskLevel,
        failureProbability: Number(prediction.failureProbability),
        modelVersion: metadata.model_version,
      },
    },
  });

  revalidatePath("/analytics");
  revalidatePath("/overview");
  revalidatePath(`/equipment/${prediction.equipmentId}`);
}
