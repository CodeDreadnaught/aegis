import type { OverviewLiveSnapshot } from "./live-types";

export const overviewFastPollingIntervalMs = 5_000;
export const overviewPassivePollingIntervalMs = 5 * 60_000;
export const overviewActivePredictionWindowMs = 2 * 60_000;

export function shouldFastPollOverview(snapshot: OverviewLiveSnapshot | null) {
  return Boolean(snapshot?.activePredictionJobCount);
}

export function getOverviewPollingInterval(snapshot: OverviewLiveSnapshot | null) {
  return shouldFastPollOverview(snapshot)
    ? overviewFastPollingIntervalMs
    : overviewPassivePollingIntervalMs;
}
