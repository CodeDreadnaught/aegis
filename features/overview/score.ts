export function calculateAiReadinessScore({
  equipmentCount,
  hasRecentReadings,
  predictedAssetCoverage,
  predictionRunCount,
}: {
  equipmentCount: number;
  hasRecentReadings: boolean;
  predictedAssetCoverage: number;
  predictionRunCount: number;
}) {
  if (!equipmentCount || !predictionRunCount || !predictedAssetCoverage) {
    return 0;
  }

  const coverageScore = percentage(predictedAssetCoverage, equipmentCount);
  const runScore = percentage(
    Math.min(predictionRunCount, equipmentCount),
    equipmentCount
  );
  const freshnessScore = hasRecentReadings ? 100 : 0;

  return Math.round(coverageScore * 0.65 + runScore * 0.25 + freshnessScore * 0.1);
}

export function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
