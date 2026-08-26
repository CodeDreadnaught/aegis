"use client";

import { useEffect, useRef } from "react";

import type { OverviewLiveSnapshot } from "./live-types";

type OverviewLiveSyncProps = {
  activeRange: string;
};

const liveRefreshEvent = "aegis:overview-refresh";
const liveSyncedEvent = "aegis:overview-synced";

export function OverviewLiveSync({ activeRange }: OverviewLiveSyncProps) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const refresh = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/overview/live?range=${activeRange}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const snapshot = (await response.json()) as OverviewLiveSnapshot;
        applySnapshot(snapshot);
        window.dispatchEvent(
          new CustomEvent(liveSyncedEvent, {
            detail: { syncedAt: snapshot.syncedAt },
          })
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    };

    const onManualRefresh = () => {
      void refresh();
    };
    const timer =
      activeRange === "1"
        ? window.setInterval(() => {
            void refresh();
          }, 15_000)
        : undefined;

    window.addEventListener(liveRefreshEvent, onManualRefresh);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      window.removeEventListener(liveRefreshEvent, onManualRefresh);
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
  setText("health-delta", `${snapshot.modelScore}% stable`);
  setText("risk-value", snapshot.activeAlertCount + snapshot.maintenanceDueCount);
  setText("risk-detail", `${snapshot.activeAlertCount} alerts`);
  setText("risk-delta", `${snapshot.maintenanceDueCount} jobs`);
  setText("ai-score-value", `${snapshot.modelScore}%`);
  setText("ai-score-delta", `${snapshot.predictionCount} runs`);
  setText("sensor-flow", `${snapshot.averageFlow.toLocaleString()} bpd`);
  setText("sensor-pressure", `${snapshot.averagePressure} bar`);
  setText("intervention-alerts", snapshot.activeAlertCount);
  setText("intervention-maintenance", snapshot.maintenanceDueCount);
  setText("telemetry-samples", `${snapshot.predictionSampleCount} samples`);

  setWidth("ai-coverage-bar", snapshot.predictionCoverage);
  setWidth("health-bar", snapshot.modelScore);
  setWidth("risk-bar", snapshot.activeAlertCount + snapshot.maintenanceDueCount);
  setWidth("ai-score-bar", snapshot.modelScore);
  setSensorBar("sensor-bar-flow", snapshot.sensorFlowPercent);
  setSensorBar("sensor-bar-pressure", snapshot.sensorPressurePercent);
  setSensorBar("sensor-bar-vibration", snapshot.sensorVibrationPercent);
  setPath("telemetry-health-area", snapshot.healthArea, snapshot.predictionSampleCount);
  setPath("telemetry-health-path", snapshot.healthPath, snapshot.predictionSampleCount);
  setPath("telemetry-risk-path", snapshot.riskPath, snapshot.predictionSampleCount);
  setDots(snapshot.healthCoordinates, snapshot.predictionSampleCount);
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

function setDots(
  coordinates: Array<{ x: number; y: number }>,
  sampleCount: number
) {
  const container = document.querySelector<SVGGElement>(
    '[data-overview-live="telemetry-dots"]'
  );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!sampleCount) {
    return;
  }

  for (const point of coordinates) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "aegis-chart-dot");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("fill", "#a8ff9f");
    circle.setAttribute("r", "4");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "2");
    container.append(circle);
  }
}
