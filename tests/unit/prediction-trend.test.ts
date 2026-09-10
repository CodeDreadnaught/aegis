import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { RiskLevel } from "@/generated/prisma/enums";
import {
  aggregateFleetPredictionStates,
  buildPredictionTrendBuckets,
  getPredictionTrendBucketSpec,
  getPredictionTrendSince,
  type FleetPredictionState,
} from "@/features/analytics/prediction-trend";

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

function date(value: string) {
  return new Date(value);
}

function state({
  equipmentId,
  healthScore,
  recordedAt,
  riskLevel = "LOW",
}: {
  equipmentId: string;
  healthScore: number;
  recordedAt: string;
  riskLevel?: RiskLevel;
}): FleetPredictionState {
  return {
    equipmentId,
    failureProbabilityPercent: 100 - healthScore,
    healthScore,
    recordedAt: date(recordedAt),
    riskLevel,
  };
}

describe("prediction trend aggregation", () => {
  it("maps selected ranges to bounded operational-time buckets", () => {
    const now = date("2026-09-07T12:00:00.000Z");

    expect(getPredictionTrendSince(7, now)?.toISOString()).toBe(
      "2026-08-31T12:00:00.000Z",
    );
    expect(getPredictionTrendSince("all", now)).toBeNull();

    const oneDay = getPredictionTrendBucketSpec({ now, range: 1 });
    const sevenDays = getPredictionTrendBucketSpec({ now, range: 7 });
    const thirtyDays = getPredictionTrendBucketSpec({ now, range: 30 });
    const allTime = getPredictionTrendBucketSpec({
      extent: {
        maxRecordedAt: date("2026-09-07T00:00:00.000Z"),
        minRecordedAt: date("2024-09-07T00:00:00.000Z"),
      },
      now,
      range: "all",
    });

    expect(oneDay?.granularity).toBe("hour");
    expect(oneDay?.bucketMs).toBe(hourMs);
    expect(sevenDays?.granularity).toBe("4hour");
    expect(sevenDays?.bucketMs).toBe(4 * hourMs);
    expect(thirtyDays?.granularity).toBe("day");
    expect(thirtyDays?.bucketMs).toBe(dayMs);

    const historicalSevenDays = getPredictionTrendBucketSpec({
      extent: {
        maxRecordedAt: date("2026-08-20T00:00:00.000Z"),
        minRecordedAt: date("2026-08-01T00:00:00.000Z"),
      },
      now,
      range: 7,
    });

    expect(historicalSevenDays?.rangeEnd.toISOString()).toBe(
      "2026-08-20T00:00:00.000Z",
    );
    expect(historicalSevenDays?.rangeStart.toISOString()).toBe(
      "2026-08-13T00:00:00.000Z",
    );

    const historicalThirtyDays = getPredictionTrendBucketSpec({
      extent: {
        maxRecordedAt: date("2026-09-01T00:00:00.000Z"),
        minRecordedAt: date("2026-08-01T00:00:00.000Z"),
      },
      now,
      range: 30,
    });

    expect(historicalThirtyDays?.rangeEnd.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(historicalThirtyDays?.rangeStart.toISOString()).toBe(
      "2026-08-02T00:00:00.000Z",
    );
    expect(allTime?.bucketMs).toBeGreaterThanOrEqual(30 * dayMs);
    expect(
      buildPredictionTrendBuckets(allTime!).length,
    ).toBeLessThanOrEqual(60);
  });

  it("lets equipment with many predictions contribute once per bucket", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["cmp-1", "pump-1"],
      freshnessMs: 3 * dayMs,
      states: [
        state({
          equipmentId: "cmp-1",
          healthScore: 90,
          recordedAt: "2026-09-01T02:00:00.000Z",
        }),
        state({
          equipmentId: "cmp-1",
          healthScore: 20,
          recordedAt: "2026-09-01T20:00:00.000Z",
          riskLevel: "HIGH",
        }),
        state({
          equipmentId: "pump-1",
          healthScore: 60,
          recordedAt: "2026-09-01T10:00:00.000Z",
        }),
      ],
    });

    expect(point?.fleetHealth).toBe(40);
    expect(point?.highRiskCount).toBe(1);
    expect(point?.highRiskPercent).toBe(50);
    expect(point?.representedEquipmentCount).toBe(2);
  });

  it("weights equipment equally even when reading frequency differs", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["high-frequency", "low-frequency"],
      freshnessMs: 3 * dayMs,
      states: [
        state({
          equipmentId: "high-frequency",
          healthScore: 95,
          recordedAt: "2026-09-01T01:00:00.000Z",
        }),
        state({
          equipmentId: "high-frequency",
          healthScore: 80,
          recordedAt: "2026-09-01T06:00:00.000Z",
        }),
        state({
          equipmentId: "high-frequency",
          healthScore: 20,
          recordedAt: "2026-09-01T22:00:00.000Z",
        }),
        state({
          equipmentId: "low-frequency",
          healthScore: 80,
          recordedAt: "2026-09-01T03:00:00.000Z",
        }),
      ],
    });

    expect(point?.fleetHealth).toBe(50);
  });

  it("carries forward a still-fresh state and marks it separately", () => {
    const [, secondPoint] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
        {
          bucketEnd: date("2026-09-03T00:00:00.000Z"),
          bucketStart: date("2026-09-02T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["cmp-1"],
      freshnessMs: 3 * dayMs,
      states: [
        state({
          equipmentId: "cmp-1",
          healthScore: 72,
          recordedAt: "2026-09-01T12:00:00.000Z",
        }),
      ],
    });

    expect(secondPoint?.fleetHealth).toBe(72);
    expect(secondPoint?.carriedForwardEquipmentCount).toBe(1);
    expect(secondPoint?.freshEquipmentCount).toBe(0);
    expect(secondPoint?.representedEquipmentCount).toBe(1);
  });

  it("excludes stale states without converting them to zero", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-12T00:00:00.000Z"),
          bucketStart: date("2026-09-11T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["cmp-1"],
      freshnessMs: 3 * dayMs,
      states: [
        state({
          equipmentId: "cmp-1",
          healthScore: 72,
          recordedAt: "2026-09-01T12:00:00.000Z",
        }),
      ],
    });

    expect(point?.fleetHealth).toBeNull();
    expect(point?.highRiskPercent).toBeNull();
    expect(point?.representedEquipmentCount).toBe(0);
    expect(point?.staleExcludedEquipmentCount).toBe(1);
  });

  it("uses the filtered eligible equipment population for coverage", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["compressor-1", "compressor-2"],
      freshnessMs: 3 * dayMs,
      states: [
        state({
          equipmentId: "compressor-1",
          healthScore: 88,
          recordedAt: "2026-09-01T12:00:00.000Z",
        }),
        state({
          equipmentId: "pump-1",
          healthScore: 10,
          recordedAt: "2026-09-01T12:00:00.000Z",
          riskLevel: "HIGH",
        }),
      ],
    });

    expect(point?.representedEquipmentCount).toBe(1);
    expect(point?.totalEligibleEquipmentCount).toBe(2);
    expect(point?.highRiskCount).toBe(0);
  });

  it("keeps no-data buckets null", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["cmp-1", "pump-1"],
      freshnessMs: dayMs,
      states: [],
    });

    expect(point?.fleetHealth).toBeNull();
    expect(point?.highRiskPercent).toBeNull();
    expect(point?.noStateEquipmentCount).toBe(2);
  });

  it("calculates high-risk percentage from represented equipment", () => {
    const [point] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-02T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["a", "b", "c", "d"],
      freshnessMs: dayMs,
      states: [
        state({ equipmentId: "a", healthScore: 20, recordedAt: "2026-09-01T01:00:00.000Z", riskLevel: "HIGH" }),
        state({ equipmentId: "b", healthScore: 80, recordedAt: "2026-09-01T01:00:00.000Z" }),
        state({ equipmentId: "c", healthScore: 75, recordedAt: "2026-09-01T01:00:00.000Z" }),
        state({ equipmentId: "d", healthScore: 70, recordedAt: "2026-09-01T01:00:00.000Z" }),
      ],
    });

    expect(point?.highRiskCount).toBe(1);
    expect(point?.highRiskPercent).toBe(25);
  });

  it("places historical backfill results by recordedAt, not inference time", () => {
    const [augustPoint, septemberPoint] = aggregateFleetPredictionStates({
      buckets: [
        {
          bucketEnd: date("2026-09-01T00:00:00.000Z"),
          bucketStart: date("2026-08-01T00:00:00.000Z"),
        },
        {
          bucketEnd: date("2026-10-01T00:00:00.000Z"),
          bucketStart: date("2026-09-01T00:00:00.000Z"),
        },
      ],
      equipmentIds: ["cmp-1"],
      freshnessMs: 60 * dayMs,
      states: [
        state({
          equipmentId: "cmp-1",
          healthScore: 44,
          recordedAt: "2026-08-15T12:00:00.000Z",
        }),
      ],
    });

    expect(augustPoint?.freshEquipmentCount).toBe(1);
    expect(augustPoint?.fleetHealth).toBe(44);
    expect(septemberPoint?.carriedForwardEquipmentCount).toBe(1);
    expect(septemberPoint?.fleetHealth).toBe(44);
  });
});