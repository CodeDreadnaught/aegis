"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  analyticsCategoryFilters,
  analyticsFleetMetricOptions,
  analyticsTrendFilters,
  analyticsTrendModes,
  type AnalyticsTrendMode,
  type AnalyticsTrendState,
  type FleetTrendMetric,
  type PredictionTrendRange,
  type SerializedEquipmentPredictionTrendPoint,
  type SerializedEquipmentPredictionTrendSummary,
  type SerializedFleetPredictionTrendPoint,
} from "@/features/analytics/trend-types";

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const trendClientCacheTtlMs = 10_000;

type TrendRequestState = Pick<
  AnalyticsTrendState,
  | "category"
  | "fleetMetric"
  | "selectedEquipmentId"
  | "trendMode"
  | "trendRange"
>;
type TrendUpdate = {
  category?: AnalyticsTrendState["category"];
  fleetMetric?: FleetTrendMetric;
  selectedEquipmentId?: string | null;
  trendMode?: AnalyticsTrendMode;
  trendRange?: PredictionTrendRange;
};

export function AnalyticsTrendPanel({
  initialState,
}: {
  initialState: AnalyticsTrendState;
}) {
  const [state, setState] = useState(initialState);
  const [draftCategory, setDraftCategory] = useState(initialState.category ?? "");
  const [draftEquipmentId, setDraftEquipmentId] = useState(
    initialState.selectedEquipmentId ?? "",
  );
  const [draftMetric, setDraftMetric] = useState(initialState.fleetMetric);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trendResponseCache = useRef(
    new Map<string, { expiresAt: number; value: AnalyticsTrendState }>([
      [
        buildTrendParams({
          category: initialState.category,
          fleetMetric: initialState.fleetMetric,
          selectedEquipmentId: initialState.selectedEquipmentId,
          trendMode: initialState.trendMode,
          trendRange: initialState.trendRange,
        }).toString(),
        { expiresAt: Number.POSITIVE_INFINITY, value: initialState },
      ],
    ]),
  );
  const isPending = pendingKey !== null;
  const isEquipmentTrend = state.trendMode === "EQUIPMENT";
  const selectedEquipment = useMemo(
    () =>
      state.equipmentOptions.find(
        equipment => equipment.id === state.selectedEquipmentId,
      ) ?? null,
    [state.equipmentOptions, state.selectedEquipmentId],
  );
  const latestFleetPoint = getLatestFleetTrendPoint(state.fleetTrend.points);
  const trendPrimaryValues = isEquipmentTrend
    ? state.equipmentTrend.points.map(point => point.healthScore)
    : state.fleetTrend.points.map(point => point.fleetHealth);
  const trendSecondaryValues = isEquipmentTrend
    ? state.equipmentTrend.points.map(point => point.failureProbabilityPercent)
    : state.fleetTrend.points.map(point =>
        getFleetSecondaryMetricValue(point, state.fleetMetric),
      );
  const healthPoints = buildLinePoints(trendPrimaryValues);
  const secondaryPoints = buildLinePoints(trendSecondaryValues);


  function applyTrendState(nextState: AnalyticsTrendState) {
    setState(nextState);
    setDraftCategory(nextState.category ?? "");
    setDraftEquipmentId(nextState.selectedEquipmentId ?? "");
    setDraftMetric(nextState.fleetMetric);
  }

  async function requestTrend(update: TrendUpdate, key: string) {
    if (isPending) {
      return;
    }

    const nextMode = update.trendMode ?? state.trendMode;
    const nextState = {
      category:
        update.category !== undefined
          ? update.category
          : draftCategory
            ? (draftCategory as AnalyticsTrendState["category"])
            : null,
      fleetMetric: update.fleetMetric ?? draftMetric,
      selectedEquipmentId:
        update.selectedEquipmentId !== undefined
          ? update.selectedEquipmentId
          : draftEquipmentId || state.selectedEquipmentId || state.equipmentOptions[0]?.id || null,
      trendMode: nextMode,
      trendRange: update.trendRange ?? state.trendRange,
    };
    const params = buildTrendParams(nextState);
    const cacheKey = params.toString();
    const cached = trendResponseCache.current.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      setError(null);
      applyTrendState(cached.value);
      writeTrendUrl(cached.value);
      return;
    }

    setPendingKey(key);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/trend?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Trend request failed with ${response.status}`);
      }

      const payload = (await response.json()) as AnalyticsTrendState;

      trendResponseCache.current.set(cacheKey, {
        expiresAt: Date.now() + trendClientCacheTtlMs,
        value: payload,
      });
      applyTrendState(payload);
      writeTrendUrl(payload);
    } catch {
      setError("Trend data could not be updated.");
    } finally {
      setPendingKey(null);
    }
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestTrend(
      {
        category: draftCategory
          ? (draftCategory as AnalyticsTrendState["category"])
          : null,
        fleetMetric: draftMetric,
        selectedEquipmentId: draftEquipmentId || null,
      },
      "apply",
    );
  }

  return (
    <section className="w-full max-w-full min-w-0">
      <Card
        className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardHeader className="grid gap-3 pb-2 lg:flex lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle>{isEquipmentTrend ? "Equipment Trend" : "Fleet Trend"}</CardTitle>
            <p className="text-sm text-zinc-500">
              {isEquipmentTrend
                ? "Chronological prediction history by reading date"
                : "Fleet health and risk share by reading date"}
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
            <TrendModeControls
              activeMode={state.trendMode}
              disabled={isPending}
              onSelect={mode => requestTrend({ trendMode: mode }, `mode-${mode}`)}
              pendingKey={pendingKey}
            />
            <TrendRangeControls
              activeRange={state.trendRange}
              disabled={isPending}
              onSelect={range => requestTrend({ trendRange: range }, `range-${range}`)}
              pendingKey={pendingKey}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0">
          <TrendControlForm
            disabled={isPending}
            draftCategory={draftCategory}
            draftEquipmentId={draftEquipmentId}
            draftMetric={draftMetric}
            equipmentOptions={state.equipmentOptions}
            mode={state.trendMode}
            onApply={handleApply}
            onCategoryChange={setDraftCategory}
            onEquipmentChange={setDraftEquipmentId}
            onMetricChange={metric => setDraftMetric(metric)}
            pendingKey={pendingKey}
          />
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <TrendSummary
            equipmentSummary={state.equipmentTrend.summary}
            fleetPoint={latestFleetPoint}
            mode={state.trendMode}
            selectedEquipment={selectedEquipment}
          />
          <PredictionTrend
            freshnessDays={state.fleetTrend.freshnessDays}
            healthPoints={healthPoints}
            mode={state.trendMode}
            primaryLabel={isEquipmentTrend ? "Health" : "Fleet health"}
            secondaryLabel={
              isEquipmentTrend
                ? "Failure risk"
                : getFleetSecondaryMetricLabel(state.fleetMetric)
            }
            secondaryPoints={secondaryPoints}
            trendPoints={
              isEquipmentTrend ? state.equipmentTrend.points : state.fleetTrend.points
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}

function TrendModeControls({
  activeMode,
  disabled,
  onSelect,
  pendingKey,
}: {
  activeMode: AnalyticsTrendMode;
  disabled: boolean;
  onSelect: (mode: AnalyticsTrendMode) => void;
  pendingKey: string | null;
}) {
  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 shadow-inner shadow-zinc-950/5">
      {analyticsTrendModes.map(mode => {
        const isActive = activeMode === mode.value;
        const isLoading = pendingKey === `mode-${mode.value}`;

        return (
          <button
            aria-busy={isLoading}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70",
              isActive
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-950",
            )}
            disabled={disabled || isActive}
            key={mode.value}
            onClick={() => onSelect(mode.value)}
            type="button"
          >
            {isLoading && <SpinnerGap aria-hidden="true" className="size-3 animate-spin" />}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function TrendRangeControls({
  activeRange,
  disabled,
  onSelect,
  pendingKey,
}: {
  activeRange: PredictionTrendRange;
  disabled: boolean;
  onSelect: (range: PredictionTrendRange) => void;
  pendingKey: string | null;
}) {
  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 shadow-inner shadow-zinc-950/5">
      {analyticsTrendFilters.map(filter => {
        const isActive = activeRange === filter.value;
        const isLoading = pendingKey === `range-${filter.value}`;

        return (
          <button
            aria-busy={isLoading}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70",
              isActive
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-950",
            )}
            disabled={disabled || isActive}
            key={filter.label}
            onClick={() => onSelect(filter.value)}
            type="button"
          >
            {isLoading && <SpinnerGap aria-hidden="true" className="size-3 animate-spin" />}
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function TrendControlForm({
  disabled,
  draftCategory,
  draftEquipmentId,
  draftMetric,
  equipmentOptions,
  mode,
  onApply,
  onCategoryChange,
  onEquipmentChange,
  onMetricChange,
  pendingKey,
}: {
  disabled: boolean;
  draftCategory: string;
  draftEquipmentId: string;
  draftMetric: FleetTrendMetric;
  equipmentOptions: AnalyticsTrendState["equipmentOptions"];
  mode: AnalyticsTrendMode;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  onCategoryChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
  onMetricChange: (value: FleetTrendMetric) => void;
  pendingKey: string | null;
}) {
  const isApplying = pendingKey === "apply";

  return (
    <form
      className="grid gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-2 md:grid-cols-[minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_auto] md:items-center"
      onSubmit={onApply}
    >
      {mode === "FLEET" ? (
        <>
          <select
            aria-label="Filter fleet trend by category"
            className="h-10 min-w-0 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled}
            onChange={event => onCategoryChange(event.target.value)}
            value={draftCategory}
          >
            <option value="">All categories</option>
            {analyticsCategoryFilters.map(option => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
          <select
            aria-label="Choose fleet secondary metric"
            className="h-10 min-w-0 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled}
            onChange={event => onMetricChange(event.target.value as FleetTrendMetric)}
            value={draftMetric}
          >
            {analyticsFleetMetricOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <select
          aria-label="Choose equipment trend"
          className="h-10 min-w-0 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          disabled={disabled}
          onChange={event => onEquipmentChange(event.target.value)}
          value={draftEquipmentId}
        >
          {equipmentOptions.map(equipment => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.assetTag} - {equipment.name}
            </option>
          ))}
        </select>
      )}
      <Button
        className="h-10 rounded-full border-[#009966] !bg-[#009966] px-4 !text-white hover:!bg-[#007a55] hover:!text-white"
        disabled={disabled}
        size="sm"
        type="submit"
      >
        {isApplying && <SpinnerGap aria-hidden="true" className="size-4 animate-spin" />}
        Apply
      </Button>
    </form>
  );
}

function TrendSummary({
  equipmentSummary,
  fleetPoint,
  mode,
  selectedEquipment,
}: {
  equipmentSummary: SerializedEquipmentPredictionTrendSummary | null;
  fleetPoint: SerializedFleetPredictionTrendPoint | null;
  mode: AnalyticsTrendMode;
  selectedEquipment: AnalyticsTrendState["equipmentOptions"][number] | null;
}) {
  if (mode === "EQUIPMENT") {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <TrendSummaryPill
          label="Equipment"
          value={selectedEquipment?.assetTag ?? "None"}
        />
        <TrendSummaryPill
          label="Health"
          value={
            equipmentSummary ? `${equipmentSummary.currentHealthScore}%` : "N/A"
          }
        />
        <TrendSummaryPill
          label="Failure Risk"
          tone="red"
          value={
            equipmentSummary
              ? `${equipmentSummary.currentFailureProbabilityPercent}%`
              : "N/A"
          }
        />
        <TrendSummaryPill
          label="Risk"
          tone="red"
          value={
            equipmentSummary
              ? formatLabel(equipmentSummary.currentRiskLevel)
              : "N/A"
          }
        />
        {equipmentSummary?.currentRecommendation && (
          <LatestRecommendationCard
            message={equipmentSummary.currentRecommendation}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <TrendSummaryPill
        label="Fleet Health"
        value={fleetPoint?.fleetHealth != null ? `${fleetPoint.fleetHealth}%` : "N/A"}
      />
      <TrendSummaryPill
        label="High-risk %"
        tone="red"
        value={fleetPoint?.highRiskPercent != null ? `${fleetPoint.highRiskPercent}%` : "N/A"}
      />
      <TrendSummaryPill
        label="Fresh states"
        tone="teal"
        value={
          fleetPoint
            ? `${fleetPoint.freshEquipmentCount} / ${fleetPoint.representedEquipmentCount}`
            : "N/A"
        }
      />
      <TrendSummaryPill
        label="Coverage"
        value={
          fleetPoint
            ? `${fleetPoint.representedEquipmentCount} / ${fleetPoint.totalEligibleEquipmentCount}`
            : "N/A"
        }
      />
    </div>
  );
}

function TrendSummaryPill({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "red" | "teal";
  value: number | string;
}) {
  const labelClass =
    tone === "red"
      ? "text-red-600"
      : tone === "teal"
        ? "text-[#2f9da7]"
        : "text-zinc-500";

  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <p className={cn("truncate text-xs font-medium leading-4", labelClass)}>
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-semibold leading-6 tracking-normal text-zinc-950 sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function LatestRecommendationCard({ message }: { message: string }) {
  const recommendation = parseRecommendationMessage(message);
  const riskLabel = recommendation.risk
    ? formatLabel(recommendation.risk)
    : null;

  return (
    <div className="col-span-2 rounded-xl border border-red-100 bg-red-50/40 p-3 shadow-sm xl:col-span-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-red-500">
            <WarningCircle aria-hidden="true" size={18} weight="bold" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-red-600">
              Latest recommendation
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-zinc-950">
              {recommendation.action ?? recommendation.raw}
            </p>
          </div>
        </div>
        {riskLabel && (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600">
            Risk: {riskLabel}
          </span>
        )}
      </div>
      {(recommendation.reason || recommendation.parameters.length > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          {recommendation.reason && (
            <div className="rounded-lg border border-red-100 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Reason
              </p>
              <p className="mt-1 text-sm leading-5 text-zinc-700">
                {recommendation.reason}
              </p>
            </div>
          )}
          {recommendation.parameters.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Review
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recommendation.parameters.map(parameter => (
                  <span
                    className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700"
                    key={parameter}
                  >
                    {parameter}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ParsedRecommendationMessage = {
  action: string | null;
  parameters: string[];
  raw: string;
  reason: string | null;
  risk: string | null;
};

function parseRecommendationMessage(message: string): ParsedRecommendationMessage {
  const raw = message.replace(/\s+/g, " ").trim();
  const match = raw.match(
    /^Risk:\s*(.*?)\.\s*Reason:\s*(.*?)\s*Relevant parameters requiring review:\s*(.*?)\.\s*Recommendation:\s*(.*)$/i,
  );

  if (!match) {
    return {
      action: null,
      parameters: [],
      raw,
      reason: null,
      risk: null,
    };
  }

  const parameters = cleanRecommendationValue(match[3])
    .split(/,\s*|\s+and\s+/i)
    .map(parameter => parameter.trim())
    .filter(
      parameter =>
        parameter.length > 0 && parameter.toLowerCase() !== "none",
    );

  return {
    action: cleanRecommendationValue(match[4]),
    parameters,
    raw,
    reason: cleanRecommendationValue(match[2]),
    risk: cleanRecommendationValue(match[1]),
  };
}

function cleanRecommendationValue(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/\.$/, "");
}
function PredictionTrend({
  freshnessDays,
  healthPoints,
  mode,
  primaryLabel,
  secondaryLabel,
  secondaryPoints,
  trendPoints,
}: {
  freshnessDays: number;
  healthPoints: ReturnType<typeof buildLinePoints>;
  mode: AnalyticsTrendMode;
  primaryLabel: string;
  secondaryLabel: string;
  secondaryPoints: ReturnType<typeof buildLinePoints>;
  trendPoints: Array<
    SerializedFleetPredictionTrendPoint | SerializedEquipmentPredictionTrendPoint
  >;
}) {
  const hasData = healthPoints.coordinates.length > 0;
  const secondaryColor =
    mode === "EQUIPMENT" || secondaryLabel.includes("High-risk")
      ? "#ef4444"
      : "#2f9da7";

  return (
    <div className="rounded-[1.1rem] border border-zinc-200 bg-white p-3 shadow-inner sm:p-4">
      <div className="mb-4 grid gap-3 lg:flex lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium text-zinc-500 sm:text-xs">
            {mode === "EQUIPMENT"
              ? "Equipment prediction history - percent over time"
              : "Fleet state snapshots - percent over time"}
          </p>
          <p className="text-xl font-semibold tracking-normal text-zinc-950 sm:text-2xl">
            {mode === "EQUIPMENT"
              ? "Equipment health history"
              : "Average fleet health"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-500 sm:gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#a8ff9f]" />
            {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: secondaryColor }}
            />
            {secondaryLabel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-4">
        <div className="relative h-48 text-left text-[11px] font-medium text-zinc-500 sm:h-64 sm:text-xs">
          {[100, 75, 50, 25, 0].map((label, index) => (
            <span
              className="absolute left-0 leading-none"
              key={label}
              style={{
                top: index * 25 + "%",
                transform:
                  index === 0
                    ? "translateY(0)"
                    : index === 4
                      ? "translateY(-100%)"
                      : "translateY(-50%)",
              }}
            >
              {label}%
            </span>
          ))}
        </div>
        <svg
          aria-label={`${primaryLabel} and ${secondaryLabel} trend`}
          className="h-48 w-full overflow-hidden sm:h-64"
          preserveAspectRatio="none"
          role="img"
          viewBox="0 0 640 240"
        >
          <defs>
            <linearGradient
              id="analytics-health-fill"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#a8ff9f" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#a8ff9f" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map(line => (
            <line
              key={line}
              stroke="#e4e4e7"
              strokeDasharray="5 8"
              strokeWidth="1"
              x1="18"
              x2="622"
              y1={line * 54 + 12}
              y2={line * 54 + 12}
            />
          ))}
          <path
            d={healthPoints.area}
            fill="url(#analytics-health-fill)"
            style={{ opacity: hasData ? 1 : 0 }}
          />
          <path
            className="aegis-line-trace"
            d={healthPoints.path}
            fill="none"
            stroke="#a8ff9f"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            style={{ opacity: hasData ? 1 : 0 }}
          />
          <path
            className="aegis-line-trace aegis-line-trace-delayed"
            d={secondaryPoints.path}
            fill="none"
            stroke={secondaryColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            style={{ opacity: hasData ? 1 : 0 }}
          />
          {!hasData && (
            <text
              fill="#71717a"
              fontSize="13"
              fontWeight="600"
              textAnchor="middle"
              x="320"
              y="124"
            >
              No represented state for this selection
            </text>
          )}
          <g>
            {healthPoints.coordinates.map(point => {
              const trendPoint = trendPoints[point.index];

              return (
                <circle
                  className="hidden sm:block aegis-chart-dot"
                  cx={point.x}
                  cy={point.y}
                  fill="#a8ff9f"
                  key={`health-${point.index}-${point.x}-${point.y}`}
                  r="4"
                  stroke="#ffffff"
                  strokeWidth="2"
                >
                  {trendPoint && (
                    <title>
                      {formatTrendPointTooltip(trendPoint, freshnessDays)}
                    </title>
                  )}
                </circle>
              );
            })}
            {secondaryPoints.coordinates.map(point => (
              <circle
                className="hidden sm:block"
                cx={point.x}
                cy={point.y}
                fill={secondaryColor}
                key={`secondary-${point.index}-${point.x}-${point.y}`}
                r="3.5"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between pl-[3.5rem] text-[11px] font-medium text-zinc-500 sm:pl-[4.25rem] sm:text-xs">
        <span>
          <span className="sm:hidden">Oldest</span>
          <span className="hidden sm:inline">Oldest state</span>
        </span>
        <span>
          <span className="sm:hidden">Latest</span>
          <span className="hidden sm:inline">Latest state</span>
        </span>
      </div>
    </div>
  );
}

function buildTrendParams(nextState: TrendRequestState) {
  const params = new URLSearchParams();

  params.set("mode", nextState.trendMode);
  params.set("trend", String(nextState.trendRange));

  if (nextState.trendMode === "FLEET") {
    if (nextState.category) {
      params.set("category", nextState.category);
    }

    params.set("metric", nextState.fleetMetric);
  } else if (nextState.selectedEquipmentId) {
    params.set("equipment", nextState.selectedEquipmentId);
  }

  return params;
}

function writeTrendUrl(nextState: AnalyticsTrendState) {
  const params = new URLSearchParams(window.location.search);

  for (const key of ["mode", "trend", "category", "metric", "equipment"]) {
    params.delete(key);
  }

  if (nextState.trendMode === "EQUIPMENT") {
    params.set("mode", "EQUIPMENT");

    if (nextState.selectedEquipmentId) {
      params.set("equipment", nextState.selectedEquipmentId);
    }
  }

  if (nextState.trendRange !== "all") {
    params.set("trend", String(nextState.trendRange));
  }

  if (nextState.trendMode === "FLEET") {
    if (nextState.category) {
      params.set("category", nextState.category);
    }

    if (nextState.fleetMetric !== "HIGH_RISK_PERCENT") {
      params.set("metric", nextState.fleetMetric);
    }
  }

  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${window.location.pathname}?${query}` : window.location.pathname,
  );
}

function getLatestFleetTrendPoint(points: SerializedFleetPredictionTrendPoint[]) {
  return points.findLast(point => point.fleetHealth !== null) ?? null;
}

function getFleetSecondaryMetricValue(
  point: SerializedFleetPredictionTrendPoint,
  metric: FleetTrendMetric,
) {
  if (metric === "COVERAGE") {
    return point.totalEligibleEquipmentCount
      ? percentage(
          point.representedEquipmentCount,
          point.totalEligibleEquipmentCount,
        )
      : null;
  }

  if (metric === "FRESH_STATES") {
    return point.totalEligibleEquipmentCount
      ? percentage(point.freshEquipmentCount, point.totalEligibleEquipmentCount)
      : null;
  }

  if (metric === "HIGH_RISK_COUNT") {
    return point.totalEligibleEquipmentCount
      ? percentage(point.highRiskCount, point.totalEligibleEquipmentCount)
      : null;
  }

  return point.highRiskPercent;
}

function getFleetSecondaryMetricLabel(metric: FleetTrendMetric) {
  if (metric === "COVERAGE") {
    return "Coverage";
  }

  if (metric === "FRESH_STATES") {
    return "Fresh states";
  }

  if (metric === "HIGH_RISK_COUNT") {
    return "High-risk share";
  }

  return "High-risk %";
}

function formatTrendPointTooltip(
  point: SerializedFleetPredictionTrendPoint | SerializedEquipmentPredictionTrendPoint,
  freshnessDays: number,
) {
  if ("fleetHealth" in point) {
    const health = point.fleetHealth === null ? "No current data" : `${point.fleetHealth}%`;
    const highRisk = point.highRiskPercent === null ? "No current data" : `${point.highRiskPercent}%`;

    return [
      `${formatDate(point.bucketStart)} - ${formatDate(point.bucketEnd)}`,
      `Fleet Health: ${health}`,
      `High Risk: ${highRisk}`,
      `High-Risk Equipment: ${point.highRiskCount}`,
      `Coverage: ${point.representedEquipmentCount} / ${point.totalEligibleEquipmentCount}`,
      `Fresh in bucket: ${point.freshEquipmentCount}`,
      `Carried forward: ${point.carriedForwardEquipmentCount}`,
      `Stale/excluded: ${point.staleExcludedEquipmentCount}`,
      `Freshness window: ${freshnessDays} days`,
    ].join("\n");
  }

  return [
    `${formatDate(point.recordedAt)} ${formatTime(point.recordedAt)}`,
    `Health: ${point.healthScore}%`,
    `Failure Risk: ${point.failureProbabilityPercent}%`,
    `Risk: ${formatLabel(point.riskLevel)}`,
  ].join("\n");
}

function buildLinePoints(values: Array<number | null>) {
  const left = 18;
  const width = 604;
  const height = 216;
  const top = 12;
  const baseY = height + top;
  const valueCount = Math.max(values.length, 1);
  const coordinates = values.map((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }

    const x =
      valueCount === 1
        ? left + width / 2
        : left + (index / (valueCount - 1)) * width;
    const y = top + height - (Math.min(Math.max(value, 0), 100) / 100) * height;

    return {
      index,
      x: Math.round(x),
      y: Math.round(y),
    };
  });
  const segments: Array<Array<{ index: number; x: number; y: number }>> = [];
  let currentSegment: Array<{ index: number; x: number; y: number }> = [];

  for (const coordinate of coordinates) {
    if (!coordinate) {
      if (currentSegment.length) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      continue;
    }

    currentSegment.push(coordinate);
  }

  if (currentSegment.length) {
    segments.push(currentSegment);
  }

  const path = segments.map(segment => buildSmoothPath(segment)).join(" ");
  const area = segments
    .filter(segment => segment.length > 1)
    .map((segment) => {
      const segmentPath = buildSmoothPath(segment);
      const first = segment[0];
      const last = segment[segment.length - 1];

      return `${segmentPath} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
    })
    .join(" ");

  return {
    area,
    coordinates: coordinates.filter(
      (coordinate): coordinate is { index: number; x: number; y: number } =>
        coordinate !== null,
    ),
    path,
  };
}

function buildSmoothPath(coordinates: Array<{ x: number; y: number }>) {
  if (!coordinates.length) {
    return "";
  }

  if (coordinates.length === 1) {
    const [{ x, y }] = coordinates;

    return `M ${x},${y}`;
  }

  return coordinates.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x},${point.y}`;
    }

    const previous = coordinates[index - 1];
    const controlX = (previous.x + point.x) / 2;

    return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
  }, "");
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map(part => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? compactDateFormatter.format(date)
    : "Unknown date";
}

function formatTime(value: string) {
  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? timeFormatter.format(date) : "";
}