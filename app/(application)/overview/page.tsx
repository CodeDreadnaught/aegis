import type { Metadata } from "next";
import {
  Bell,
  ChartLineUp,
  Cpu,
  Gauge,
  Pulse,
  ShieldWarning,
  TrendUp,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { PremiumMotion } from "@/components/motion/premium-motion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  OverviewAssetTable,
  type OverviewAssetRow,
} from "@/features/overview/overview-asset-table";
import { OverviewControls } from "@/features/overview/overview-controls";
import { OverviewLiveSync } from "@/features/overview/overview-live-sync";
import {
  getOverviewWorkspace,
  type OverviewRange,
} from "@/features/overview/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Overview",
};

type OverviewPageProps = {
  searchParams: Promise<{ range?: string | string[] }>;
};

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
});

const ringColors = [
  "#184f4f",
  "#a8ff9f",
  "#b7b7b7",
  "#2f9da7",
  "#f2bd3f",
  "#ef7b63",
];

export default async function OverviewPage({
  searchParams,
}: OverviewPageProps) {
  await requirePermission("viewEquipment");
  const params = await searchParams;
  const range = parseRange(params.range);
  const {
    latestMaintenance,
    latestPredictions,
    latestReadings,
    predictionTrend,
    recentActivity,
    stats,
    assetMixEquipment,
  } = await getOverviewWorkspace(range);

  const averageHealth = average(
    latestPredictions.map((prediction) => Number(prediction.healthScore))
  );
  const averageFailureProbability = average(
    latestPredictions.map(
      (prediction) => Number(prediction.failureProbability) * 100
    )
  );
  const predictedAssetCoverage = new Set(
    latestPredictions.map((prediction) => prediction.equipment.assetTag)
  ).size;
  const activeRate = percentage(stats.activeEquipmentCount, stats.equipmentCount);
  const predictionCoverage = percentage(
    predictedAssetCoverage,
    stats.equipmentCount
  );
  const interventionLoad = stats.activeAlertCount + stats.maintenanceDueCount;
  const modelScore = latestPredictions.length
    ? Math.max(0, Math.round(100 - averageFailureProbability))
    : 0;
  const healthTrend = predictionTrend
    .slice()
    .reverse()
    .map((prediction) => Number(prediction.healthScore));
  const failureTrend = predictionTrend
    .slice()
    .reverse()
    .map((prediction) => Number(prediction.failureProbability) * 100);
  const healthPoints = buildLinePoints(healthTrend);
  const failurePoints = buildLinePoints(failureTrend);
  const signalBars = latestReadings
    .slice()
    .reverse()
    .slice(-7)
    .map((reading) => ({
      id: reading.id,
      label: reading.equipment.assetTag.replace("AEG-", ""),
      vibration: readParameter(reading.parameters, "vibrationMmS"),
      pressure: readParameter(reading.parameters, "pressureBar"),
      flow: readParameter(reading.parameters, "flowRateBpd"),
    }));
  const maxVibration = Math.max(
    1,
    ...signalBars.map((reading) => reading.vibration)
  );
  const maxPressure = Math.max(1, ...signalBars.map((reading) => reading.pressure));
  const maxFlow = Math.max(1, ...signalBars.map((reading) => reading.flow));
  const averageVibration = average(signalBars.map((reading) => reading.vibration));
  const averagePressure = average(signalBars.map((reading) => reading.pressure));
  const averageFlow = average(signalBars.map((reading) => reading.flow));
  const assetRows: OverviewAssetRow[] = latestPredictions.map((prediction) => ({
    asset: prediction.equipment.assetTag,
    category: formatEquipmentCategory(prediction.equipment.category),
    failure: Math.round(Number(prediction.failureProbability) * 100),
    health: Number(prediction.healthScore),
    location: prediction.equipment.location,
    name: prediction.equipment.name,
    recommendation:
      prediction.recommendations[0]?.message ??
      "Continue monitoring and planned maintenance.",
    risk: prediction.riskLevel,
    updated: compactDateFormatter.format(prediction.createdAt),
  }));
  const kpis = [
    {
      label: "Fleet",
      value: stats.equipmentCount,
      detail: `${activeRate}% active`,
      liveKey: "fleet",
      icon: Gauge,
      tone: "bg-[#e8fbf6] text-[#146c74]",
      delta: "Live",
      accent: "bg-[#2f9da7]",
      progress: activeRate,
    },
    {
      label: "AI Coverage",
      value: `${predictionCoverage}%`,
      detail: `${predictedAssetCoverage} assets`,
      liveKey: "ai-coverage",
      icon: Cpu,
      tone: "bg-[#eefbfc] text-[#146c74]",
      delta: `${latestPredictions.length} runs`,
      accent: "bg-[#5ec3cf]",
      progress: predictionCoverage,
    },
    {
      label: "Health",
      value: latestPredictions.length ? `${Math.round(averageHealth)}%` : "N/A",
      detail: "Average score",
      liveKey: "health",
      icon: Pulse,
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      delta: `${modelScore}% stable`,
      accent: "bg-[#f2bd3f]",
      progress: modelScore,
    },
    {
      label: "Risk",
      value: interventionLoad,
      detail: `${stats.activeAlertCount} alerts`,
      liveKey: "risk",
      icon: ShieldWarning,
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      delta: `${stats.maintenanceDueCount} jobs`,
      accent: "bg-[#ef7b63]",
      progress: interventionLoad,
    },
  ];
  const commandBars = [
    {
      label: "Avg Flow",
      shortLabel: "Flow",
      value: Math.round(averageFlow),
      max: Math.max(1, Math.round(maxFlow)),
      color: "bg-[#2f9da7]",
      liveKey: "sensor-bar-flow",
    },
    {
      label: "Avg Pressure",
      shortLabel: "Press",
      value: Math.round(averagePressure),
      max: Math.max(1, Math.round(maxPressure)),
      color: "bg-[#5ec3cf]",
      liveKey: "sensor-bar-pressure",
    },
    {
      label: "Avg Vibration",
      shortLabel: "Vib",
      value: Math.round(averageVibration * 10),
      max: Math.max(1, Math.round(maxVibration * 10)),
      color: "bg-[#f2bd3f]",
      liveKey: "sensor-bar-vibration",
    },
  ];
  const totalCategoryCount = stats.categoryCounts.reduce(
    (sum, item) => sum + item.count,
    0
  );
  const visibleCategoryCounts = stats.categoryCounts.slice(0, 6);
  const hiddenCategoryCount = stats.categoryCounts
    .slice(6)
    .reduce((sum, item) => sum + item.count, 0);
  const assetMixRows = hiddenCategoryCount
    ? [
        ...visibleCategoryCounts,
        { category: "Other", count: hiddenCategoryCount },
      ]
    : visibleCategoryCounts;
  const topAssetMixRows = assetMixRows.slice(0, 3);
  const otherAssetMixCount = assetMixRows
    .slice(3)
    .reduce((sum, item) => sum + item.count, 0);
  const assetMixLegendRows = otherAssetMixCount
    ? [...topAssetMixRows, { category: "Others", count: otherAssetMixCount }]
    : topAssetMixRows;
  const orderedAssetMixLegendRows = [
    ...assetMixLegendRows.filter((row) => row.category !== "Others"),
    ...assetMixLegendRows.filter((row) => row.category === "Others"),
  ];
  const otherAssetMixCategories = new Set(
    assetMixRows.slice(3).map((item) => item.category)
  );
  const assetMixDisplayRows = orderedAssetMixLegendRows.map((row, index) => {
    const isOthers = row.category === "Others";
    const assets = assetMixEquipment
      .filter((equipment) =>
        isOthers
          ? otherAssetMixCategories.has(equipment.category)
          : equipment.category === row.category
      )
      .slice(0, 4);
    const remainingCount = Math.max(0, row.count - assets.length);

    return {
      assets,
      category: row.category,
      color: ringColors[index % ringColors.length],
      count: row.count,
      label:
        row.category === "Other" || row.category === "Others"
          ? row.category
          : formatEquipmentCategory(row.category),
      remainingCount,
    };
  });

  return (
    <PremiumMotion profile="overview">
      <div className="grid gap-4">
        <OverviewLiveSync activeRange={String(range)} />
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div data-motion="reveal">
            <p className="text-sm font-medium text-[#2f9da7]">Overview</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
              Operational Intelligence
            </h1>
          </div>
          <div data-motion="reveal">
            <OverviewControls activeRange={String(range)} />
          </div>
        </section>

        <section className="grid items-stretch gap-4 xl:grid-cols-[1.12fr_0.78fr_0.82fr]">
          <div className="grid h-full gap-4 xl:grid-rows-[auto_1fr]">
            <div className="grid items-start gap-3 sm:grid-cols-2">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;

                return (
                  <Card
                    className="h-fit rounded-[1.2rem] border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
                    data-motion="metric"
                    key={kpi.label}
                  >
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-500">
                            {kpi.label}
                          </p>
                          <p
                            className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950"
                            data-overview-live={`${kpi.liveKey}-value`}
                          >
                            {kpi.value}
                          </p>
                        </div>
                        <div
                          className={`grid size-8 place-items-center rounded-full ${kpi.tone}`}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <span
                          className="text-zinc-500"
                          data-overview-live={`${kpi.liveKey}-detail`}
                        >
                          {kpi.detail}
                        </span>
                        <span
                          className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-700"
                          data-overview-live={`${kpi.liveKey}-delta`}
                        >
                          {kpi.delta}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${kpi.accent}`}
                          data-overview-live={`${kpi.liveKey}-bar`}
                          style={{ width: `${kpi.progress}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card
              className="h-full rounded-[1.2rem] border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
              data-motion="panel"
            >
              <CardContent className="flex h-full flex-col justify-between px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      AI Score
                    </p>
                    <p
                      className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950"
                      data-overview-live="ai-score-value"
                    >
                      {modelScore}%
                    </p>
                  </div>
                  <div className="grid size-8 place-items-center rounded-full bg-[#eefbfc] text-[#146c74]">
                    <TrendUp aria-hidden="true" className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-500">Model confidence</span>
                    <span
                      className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-700"
                      data-overview-live="ai-score-delta"
                    >
                      {latestPredictions.length} runs
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-[#2f9da7]"
                      data-overview-live="ai-score-bar"
                      style={{ width: `${modelScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card
            className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Asset Mix</CardTitle>
                <p className="text-sm text-zinc-500">Equipment distribution</p>
              </div>
              <div className="rounded-full bg-zinc-100 p-1 text-xs font-semibold text-zinc-500">
                <span className="rounded-full bg-[#2f9da7] px-3 py-1 text-white">
                  {stats.equipmentCount} assets
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              {assetMixRows.length ? (
                <>
                  <AssetMixRings
                    rows={assetMixDisplayRows}
                    total={totalCategoryCount}
                  />
                  <div className="mt-5 grid gap-3">
                    {assetMixDisplayRows.map((category) => (
                      <DistributionRow
                        color={category.color}
                        key={category.category}
                        label={category.label}
                        meta={`${category.count} assets`}
                        value={`${percentage(category.count, totalCategoryCount)}%`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState label="No asset mix data" />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-rows-[auto_1fr]">
            <Card
              className="rounded-[1.35rem] border-zinc-200 bg-[#fff8e6] shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>Sensor Stack</CardTitle>
                  <p className="text-xs text-zinc-500">Vibration, pressure, flow</p>
                </div>
                <ChartLineUp aria-hidden="true" className="size-5 text-zinc-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <SignalStat
                    label="Avg flow"
                    liveKey="sensor-flow"
                    value={`${Math.round(averageFlow).toLocaleString()} bpd`}
                  />
                  <SignalStat
                    label="Avg pressure"
                    liveKey="sensor-pressure"
                    value={`${Math.round(averagePressure)} bar`}
                  />
                </div>
                <SignalLoadBars bars={commandBars} />
              </CardContent>
            </Card>

            <div className="grid xl:h-full">
              <Card
                className="h-full rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
                data-motion="panel"
              >
                <CardHeader className="pb-2">
                  <CardTitle>Interventions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 p-4 pt-0">
                  <FocusItem
                    icon={Bell}
                    label="Alerts"
                    liveKey="intervention-alerts"
                    value={stats.activeAlertCount}
                  />
                  <FocusItem
                    icon={Wrench}
                    label="Maintenance"
                    liveKey="intervention-maintenance"
                    value={stats.maintenanceDueCount}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section>
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Asset Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <OverviewAssetTable rows={assetRows} />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card
            className="h-fit rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Telemetry Flow</CardTitle>
                <p className="text-sm text-zinc-500">Health and failure risk</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                data-overview-live="telemetry-samples"
                variant="outline"
              >
                {predictionTrend.length} samples
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <LineTrend
                failurePoints={failurePoints}
                healthPoints={healthPoints}
                hasData={predictionTrend.length > 0}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-2">
          <Card
            className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Maintenance Plans</CardTitle>
            </CardHeader>
            <CardContent className="gap-4 p-4 pt-0">
              {latestMaintenance.slice(0, 5).map((record) => (
                <PlanRow
                  key={record.id}
                  label={record.equipment.assetTag}
                  meta={record.status.replaceAll("_", " ")}
                  value={record.nextDueDate ? "Due" : "Logged"}
                  width={record.nextDueDate ? 74 : 48}
                />
              ))}
              {!latestMaintenance.length && <EmptyState label="No maintenance" />}
            </CardContent>
          </Card>

          <Card
            className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="gap-2 p-4 pt-0">
              {recentActivity.slice(0, 5).map((activity) => (
                <div
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={activity.id}
                >
                  <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#eefbfc] text-[#146c74]">
                    <TrendUp aria-hidden="true" className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {activity.type}
                      </p>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {timeFormatter.format(activity.timestamp)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {activity.detail}
                    </p>
                  </div>
                </div>
              ))}
              {!recentActivity.length && <EmptyState label="No activity" />}
            </CardContent>
          </Card>
        </section>
      </div>
    </PremiumMotion>
  );
}

function FocusItem({
  icon: Icon,
  label,
  liveKey,
  value,
}: {
  icon: typeof Bell;
  label: string;
  liveKey: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-white text-zinc-950 shadow-sm">
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <span className="text-sm font-medium text-zinc-600">{label}</span>
      </div>
      <span className="text-2xl font-semibold" data-overview-live={liveKey}>
        {value}
      </span>
    </div>
  );
}

function LineTrend({
  failurePoints,
  hasData,
  healthPoints,
}: {
  failurePoints: ReturnType<typeof buildLinePoints>;
  hasData: boolean;
  healthPoints: ReturnType<typeof buildLinePoints>;
}) {
  return (
    <div className="rounded-[1.1rem] border border-zinc-200 bg-white p-4 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">Predictive trend</p>
          <p className="text-2xl font-semibold tracking-normal text-zinc-950">
            Health trajectory
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#a8ff9f]" />
            Health
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-950" />
            Failure risk
          </span>
        </div>
      </div>
      <svg
        aria-label="Predictive telemetry trend"
        className="h-64 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 680 260"
      >
        <defs>
          <linearGradient id="health-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a8ff9f" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#a8ff9f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            stroke="#e4e4e7"
            strokeDasharray="5 8"
            strokeWidth="1"
            x1="0"
            x2="680"
            y1={line * 60 + 10}
            y2={line * 60 + 10}
          />
        ))}
        <path
          d={healthPoints.area}
          data-overview-live="telemetry-health-area"
          fill="url(#health-fill)"
          style={{ opacity: hasData ? 1 : 0 }}
        />
        <path
          className="aegis-line-trace"
          data-overview-live="telemetry-health-path"
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
          data-overview-live="telemetry-risk-path"
          d={failurePoints.path}
          fill="none"
          stroke="#18181b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          style={{ opacity: hasData ? 1 : 0 }}
        />
        <g data-overview-live="telemetry-dots">
          {hasData &&
            healthPoints.coordinates.map((point) => (
              <circle
                className="aegis-chart-dot"
                cx={point.x}
                cy={point.y}
                fill="#a8ff9f"
                key={`${point.x}-${point.y}`}
                r="4"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))}
        </g>
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs font-medium text-zinc-500">
        <span>Oldest</span>
        <span>Latest</span>
      </div>
    </div>
  );
}

function SignalStat({
  label,
  liveKey,
  value,
}: {
  label: string;
  liveKey: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2 shadow-sm ring-1 ring-zinc-950/5">
      <p className="text-[10px] font-semibold uppercase text-zinc-500">
        {label}
      </p>
      <p
        className="mt-1 truncate text-sm font-semibold text-zinc-950"
        data-overview-live={liveKey}
      >
        {value}
      </p>
    </div>
  );
}

function AssetMixRings({
  rows,
  total,
}: {
  rows: Array<{
    assets: Array<{ assetTag: string; name: string }>;
    category: string;
    color: string;
    count: number;
    label: string;
    remainingCount: number;
  }>;
  total: number;
}) {
  return (
    <div className="grid place-items-center rounded-[1.1rem] bg-[#f7faf9] p-5">
      <div className="relative grid size-52 place-items-center">
        <svg
          aria-label="Asset mix distribution"
          className="absolute inset-0 size-full -rotate-90"
          role="img"
          viewBox="0 0 220 220"
        >
          {rows
            .map((row, index) => {
              const radius = 92 - (rows.length - 1 - index) * 14;

              return (
                <circle
                  aria-hidden="true"
                  cx="110"
                  cy="110"
                  fill="none"
                  key={`${row.category}-track`}
                  r={radius}
                  stroke="#e8f4e6"
                  strokeWidth="12"
                />
              );
            })
            .reverse()}
        {rows.map((row, index) => {
          const share = percentage(row.count, total);
          const radius = 92 - (rows.length - 1 - index) * 14;
          const circumference = 2 * Math.PI * radius;
          const dasharray = `${(share / 100) * circumference} ${circumference}`;

          return (
            <Tooltip key={row.category}>
              <circle
                aria-hidden="true"
                className="transition-opacity duration-200"
                cx="110"
                cy="110"
                fill="none"
                r={radius}
                stroke={row.color}
                strokeDasharray={dasharray}
                strokeLinecap="round"
                strokeWidth="12"
                style={{
                  filter:
                    index === 0
                      ? "drop-shadow(0 8px 16px rgb(24 24 27 / 0.12))"
                      : undefined,
                }}
              />
              <TooltipTrigger
                render={
                  <circle
                    aria-label={`${row.label} asset mix details`}
                    className="cursor-pointer outline-none transition-opacity duration-200 hover:opacity-75 focus-visible:opacity-75"
                    cx="110"
                    cy="110"
                    fill="none"
                    r={radius}
                    role="button"
                    stroke="transparent"
                    strokeDasharray={dasharray}
                    strokeLinecap="round"
                    strokeWidth="24"
                    tabIndex={0}
                  />
                }
              />
              <TooltipContent
                align="center"
                className="grid max-w-64 gap-2 rounded-lg bg-zinc-950 p-3 text-left text-white"
                side="top"
              >
                <AssetMixTooltip row={row} total={total} />
              </TooltipContent>
            </Tooltip>
          );
        })}
        </svg>
        <div className="relative grid size-20 place-items-center rounded-full bg-white shadow-[inset_0_2px_14px_rgba(24,24,27,0.08)]">
          <div className="text-center">
            <p className="text-2xl font-semibold text-zinc-950">{total}</p>
            <p className="text-[10px] font-semibold uppercase text-zinc-500">
              Assets
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetMixTooltip({
  row,
  total,
}: {
  row: {
    assets: Array<{ assetTag: string; name: string }>;
    count: number;
    label: string;
    remainingCount: number;
  };
  total: number;
}) {
  return (
    <div>
      <p className="font-semibold">
        {row.label} - {percentage(row.count, total)}%
      </p>
      <p className="mt-0.5 text-[11px] text-white/70">
        {row.count} assets in this group
      </p>
      {!!row.assets.length && (
        <div className="mt-2 grid gap-1">
          {row.assets.map((asset) => (
            <p className="truncate text-[11px] text-white/85" key={asset.assetTag}>
              {asset.assetTag} - {asset.name}
            </p>
          ))}
          {row.remainingCount > 0 && (
            <p className="text-[11px] text-white/65">
              Others - {row.remainingCount} assets
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SignalLoadBars({
  bars,
}: {
  bars: Array<{
    color: string;
    label: string;
    liveKey: string;
    max: number;
    shortLabel: string;
    value: number;
  }>;
}) {
  return (
    <div className="mt-4 flex h-36 items-end gap-3 rounded-[1rem] bg-white/70 px-4 pb-3 pt-4 shadow-inner ring-1 ring-zinc-950/5">
      {bars.map((bar) => (
        <div
          className="flex min-w-0 flex-1 flex-col items-center gap-2"
          key={bar.label}
        >
          <div className="flex h-24 w-full items-end justify-center">
            <span
              className={`aegis-graph-bar block w-full max-w-10 rounded-full ${bar.color}`}
              data-overview-live={bar.liveKey}
              style={{
                height: `${Math.max(10, percentage(bar.value, bar.max))}%`,
              }}
            />
          </div>
          <span className="max-w-full truncate text-[10px] font-semibold uppercase text-zinc-500">
            {bar.shortLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

function DistributionRow({
  color,
  label,
  meta,
  value,
}: {
  color: string;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">{label}</p>
          <p className="text-xs text-zinc-500">{meta}</p>
        </div>
      </div>
      <span className="rounded-md bg-[#edf7e9] px-2 py-1 text-xs font-semibold text-zinc-700">
        {value}
      </span>
    </div>
  );
}

function PlanRow({
  label,
  meta,
  value,
  width,
}: {
  label: string;
  meta: string;
  value: string;
  width: number;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-950">{label}</p>
          <p className="truncate text-xs text-zinc-500">{meta}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-zinc-500">
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-950"
          style={{ width: `${Math.min(100, Math.max(0, width))}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
      {label}
    </div>
  );
}

function parseRange(value: string | string[] | undefined): OverviewRange {
  const range = Array.isArray(value) ? value[0] : value;

  if (range === "1" || range === "7" || range === "30") {
    return Number(range) as OverviewRange;
  }

  return 1;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (!validValues.length) {
    return 0;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}

function buildLinePoints(values: number[]) {
  const width = 680;
  const height = 230;
  const top = 12;
  const fallback = values.length ? values : [0];
  const max = Math.max(100, ...fallback);
  const coordinates = fallback.map((value, index) => {
    const x =
      fallback.length === 1 ? width / 2 : (index / (fallback.length - 1)) * width;
    const y = top + height - (Math.min(value, max) / max) * height;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });
  const path = buildSmoothPath(coordinates);
  const area = coordinates.length
    ? `${path} L ${width},${height + top} L 0,${height + top} Z`
    : "";

  return {
    area,
    coordinates,
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
