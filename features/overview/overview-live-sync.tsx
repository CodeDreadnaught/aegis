"use client";

import { useEffect, useRef } from "react";

import { getOverviewPollingInterval } from "./live-polling";
import type { OverviewLiveSnapshot } from "./live-types";

type OverviewLiveSyncProps = {
  activeRange: string;
};

const liveRefreshEvent = "aegis:overview-refresh";
const liveSyncedEvent = "aegis:overview-synced";

export function OverviewLiveSync({ activeRange }: OverviewLiveSyncProps) {
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleNextRefresh = (snapshot: OverviewLiveSnapshot | null) => {
      clearTimer();

      if (activeRange !== "1" || document.hidden) {
        return;
      }

      const interval = getOverviewPollingInterval(snapshot);

      timerRef.current = window.setTimeout(() => {
        void refresh({ schedule: true });
      }, interval);
    };

    const refresh = async ({ schedule = false } = {}) => {
      if (document.hidden) {
        clearTimer();
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/overview/live?range=${activeRange}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (schedule) {
            scheduleNextRefresh(null);
          }
          return;
        }

        const snapshot = (await response.json()) as OverviewLiveSnapshot;
        applySnapshot(snapshot);
        window.dispatchEvent(
          new CustomEvent(liveSyncedEvent, {
            detail: { syncedAt: snapshot.syncedAt },
          })
        );
        scheduleNextRefresh(snapshot);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (schedule) {
          scheduleNextRefresh(null);
        }
      }
    };

    const onManualRefresh = () => {
      void refresh();
    };
    const onFocus = () => {
      void refresh({ schedule: true });
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
        abortRef.current?.abort();
        return;
      }

      void refresh({ schedule: true });
    };

    window.addEventListener(liveRefreshEvent, onManualRefresh);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void refresh({ schedule: true });

    return () => {
      clearTimer();
      window.removeEventListener(liveRefreshEvent, onManualRefresh);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [activeRange]);

  return null;
}

function applySnapshot(snapshot: OverviewLiveSnapshot) {
  setText("fleet-value", snapshot.equipmentCount);
  setText("fleet-detail", `${snapshot.activeRate}% active`);
  setText("ai-coverage-value", `${snapshot.predictionCoverage}%`);
  setText("ai-coverage-detail", `${snapshot.predictedAssetCoverage} assets`);
  setText("ai-coverage-delta", `${snapshot.predictionCount} runs`);
  setText(
    "health-value",
    snapshot.predictionCount ? `${snapshot.averageHealth}%` : "N/A"
  );
  setText("health-delta", `${snapshot.predictionCount} runs`);
  setText("risk-value", snapshot.activeAlertCount + snapshot.maintenanceDueCount);
  setText("risk-detail", `${snapshot.activeAlertCount} alerts`);
  setText("risk-delta", `${snapshot.maintenanceDueCount} jobs`);
  setText("ai-score-value", `${snapshot.aiScore}%`);
  setText("ai-score-delta", `${snapshot.predictionCoverage}% coverage`);
  setText("sensor-flow", `${snapshot.averageFlow.toLocaleString()} bpd`);
  setText("sensor-pressure", `${snapshot.averagePressure} bar`);
setText("intervention-alerts", snapshot.activeAlertCount);
  setText("intervention-maintenance", snapshot.maintenanceDueCount);
  setText("telemetry-samples", `${snapshot.predictionSampleCount} samples`);

  setWidth("ai-coverage-bar", snapshot.predictionCoverage);
  setWidth("health-bar", snapshot.predictionCount ? snapshot.averageHealth : 0);
  setWidth("risk-bar", snapshot.activeAlertCount + snapshot.maintenanceDueCount);
  setWidth("ai-score-bar", snapshot.aiScore);
  setSensorBar("sensor-bar-flow", snapshot.sensorFlowPercent);
  setSensorBar("sensor-bar-pressure", snapshot.sensorPressurePercent);
setPath("telemetry-health-area", snapshot.healthArea, snapshot.predictionSampleCount);
  setPath("telemetry-health-path", snapshot.healthPath, snapshot.predictionSampleCount);
  setPath("telemetry-risk-path", snapshot.riskPath, snapshot.predictionSampleCount);
}

function setText(name: string, value: number | string) {
  const element = document.querySelector(`[data-overview-live="${name}"]`);

  if (element) {
    element.textContent = String(value);
  }
}

function setWidth(name: string, value: number) {
  const element = document.querySelector<HTMLElement>(
    `[data-overview-live="${name}"]`
  );

  if (element) {
    element.style.width = `${Math.min(100, Math.max(0, value))}%`;
  }
}

function setSensorBar(name: string, value: number) {
  const element = document.querySelector<HTMLElement>(
    `[data-overview-live="${name}"]`
  );

  if (element) {
    element.style.height = `${Math.min(100, Math.max(10, value))}%`;
  }
}

function setPath(name: string, value: string, sampleCount: number) {
  const element = document.querySelector<SVGPathElement>(
    `[data-overview-live="${name}"]`
  );

  if (!element) {
    return;
  }

  element.setAttribute("d", value);
  element.style.opacity = sampleCount ? "1" : "0";
}









