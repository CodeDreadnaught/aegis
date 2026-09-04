import { describe, expect, it } from "vitest";

import {
  getOverviewPollingInterval,
  overviewActivePredictionWindowMs,
  overviewFastPollingIntervalMs,
  overviewPassivePollingIntervalMs,
  shouldFastPollOverview,
} from "@/features/overview/live-polling";
import type { OverviewLiveSnapshot } from "@/features/overview/live-types";

function snapshot(activePredictionJobCount: number) {
  return {
    activePredictionJobCount,
  } as OverviewLiveSnapshot;
}

describe("overview live polling policy", () => {
  it("uses fast polling only while fresh active prediction work exists", () => {
    expect(shouldFastPollOverview(snapshot(1))).toBe(true);
    expect(getOverviewPollingInterval(snapshot(1))).toBe(
      overviewFastPollingIntervalMs
    );
  });

  it("falls back to passive polling when no fresh prediction work exists", () => {
    expect(shouldFastPollOverview(snapshot(0))).toBe(false);
    expect(getOverviewPollingInterval(snapshot(0))).toBe(
      overviewPassivePollingIntervalMs
    );
    expect(getOverviewPollingInterval(null)).toBe(overviewPassivePollingIntervalMs);
  });

  it("keeps the fast polling window bounded", () => {
    expect(overviewActivePredictionWindowMs).toBe(120_000);
    expect(overviewPassivePollingIntervalMs).toBe(300_000);
  });
});
