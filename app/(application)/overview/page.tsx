import type { Metadata } from "next";
import {
  Bell,
  ChartLineUp,
  Cpu,
  Gauge,
  Pulse,
  ShieldWarning,
  TrendUp,
  WarningCircle,
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
  OverviewAssetTable,
  type OverviewAssetRow,
} from "@/features/overview/overview-asset-table";
import { OverviewControls } from "@/features/overview/overview-controls";
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
    latestAlerts,
    latestMaintenance,
    latestPredictions,
    latestReadings,
    predictionTrend,
    recentActivity,
    stats,
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
      icon: Gauge,
      tone: "bg-zinc-950 text-white",
      delta: "Live",
      accent: "bg-[#2f9da7]",
    },
    {
      label: "AI Coverage",
      value: `${predictionCoverage}%`,
      detail: `${predictedAssetCoverage} assets`,
      icon: Cpu,
      tone: "bg-[#eefbfc] text-[#146c74]",
      delta: `${latestPredictions.length} runs`,
      accent: "bg-[#5ec3cf]",
    },
    {
      label: "Health",
      value: latestPredictions.length ? `${Math.round(averageHealth)}%` : "N/A",
      detail: "Average score",
      icon: Pulse,
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      delta: `${modelScore}% stable`,
      accent: "bg-[#f2bd3f]",
    },
    {
      label: "Risk",
      value: interventionLoad,
      detail: `${stats.activeAlertCount} alerts`,
      icon: ShieldWarning,
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      delta: `${stats.maintenanceDueCount} jobs`,
      accent: "bg-[#ef7b63]",
    },
  ];
  const commandBars = [
    {
      label: "Avg Flow",
      shortLabel: "Flow",
      value: Math.round(averageFlow),
      max: Math.max(1, Math.round(maxFlow)),
      color: "bg-[#2f9da7]",
    },
    {
      label: "Avg Pressure",
      shortLabel: "Press",
      value: Math.round(averagePressure),
      max: Math.max(1, Math.round(maxPressure)),
      color: "bg-[#5ec3cf]",
    },
    {
      label: "Avg Vibration",
      shortLabel: "Vib",
      value: Math.round(averageVibration * 10),
      max: Math.max(1, Math.round(maxVibration * 10)),
      color: "bg-[#f2bd3f]",
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

  return (
    <PremiumMotion profile="overview">
      <div className="grid gap-4">
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

        <section className="grid items-start gap-4 xl:grid-cols-[1.12fr_0.78fr_0.82fr]">
          <div className="grid gap-4">
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
                          <p className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
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
                        <span className="text-zinc-500">{kpi.detail}</span>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-700">
                          {kpi.delta}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div className={`h-full rounded-full ${kpi.accent}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card
              className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>Failure Trend</CardTitle>
                  <p className="text-sm text-zinc-500">Health score and failure probability</p>
                </div>
                <Badge
                  className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                  variant="outline"
                >
                  {predictionTrend.length} samples
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {predictionTrend.length ? (
                  <LineTrend
                    failurePoints={failurePoints}
                    healthPoints={healthPoints}
                  />
                ) : (
                  <EmptyState label="No prediction trend yet" />
                )}
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
                  <AssetMixRings rows={assetMixRows} total={totalCategoryCount} />
                  <div className="mt-5 grid gap-3">
                    {assetMixLegendRows.map((category, index) => (
                      <DistributionRow
                        color={ringColors[index % ringColors.length]}
                        key={category.category}
                        label={
                          category.category === "Other" ||
                          category.category === "Others"
                            ? category.category
                            : formatEquipmentCategory(category.category)
                        }
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

          <div className="grid gap-4">
            <Card
              className="rounded-[1.35rem] border-zinc-200 bg-[#fff8e6] shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>Signal Load</CardTitle>
                  <p className="text-xs text-zinc-500">Operational workload</p>
                </div>
                <ChartLineUp aria-hidden="true" className="size-5 text-zinc-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <SignalStat label="Avg flow" value={`${Math.round(averageFlow).toLocaleString()} bpd`} />
                  <SignalStat label="Avg pressure" value={`${Math.round(averagePressure)} bar`} />
                </div>
                <SignalLoadBars bars={commandBars} />
              </CardContent>
            </Card>

            <Card
              className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>AI Score</CardTitle>
                  <p className="text-sm text-zinc-500">Model confidence</p>
                </div>
                <TrendUp aria-hidden="true" className="size-5 text-[#2f9da7]" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-4xl font-semibold tracking-normal text-zinc-950">
                  {modelScore}%
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-[#2f9da7]"
                    style={{ width: `${modelScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="pb-2">
                <CardTitle>Interventions</CardTitle>
              </CardHeader>
              <CardContent className="gap-2 p-4 pt-0">
                <FocusItem icon={Bell} label="Alerts" value={stats.activeAlertCount} />
                <FocusItem
                  icon={Wrench}
                  label="Maintenance"
                  value={stats.maintenanceDueCount}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[1.48fr_0.72fr]">
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
                variant="outline"
              >
                {predictionTrend.length} samples
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {predictionTrend.length ? (
                <LineTrend failurePoints={failurePoints} healthPoints={healthPoints} />
              ) : (
                <EmptyState label="No prediction trend yet" />
              )}
            </CardContent>
          </Card>

          <Card
            className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Sensor Stack</CardTitle>
              <p className="text-sm text-zinc-500">Vibration, pressure, flow</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {signalBars.length ? (
                <div className="flex h-72 items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 pb-4 pt-5">
                  {signalBars.map((reading) => (
                    <div
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                      key={reading.id}
                    >
                      <div className="flex h-52 w-full max-w-10 items-end justify-center gap-1">
                        <span
                          className="aegis-graph-bar w-2 rounded-full bg-zinc-950"
                          style={{
                            height: `${percentage(reading.vibration, maxVibration)}%`,
                          }}
                        />
                        <span
                          className="aegis-graph-bar w-2 rounded-full bg-[#2f9da7]"
                          style={{
                            height: `${percentage(reading.pressure, maxPressure)}%`,
                          }}
                        />
                        <span
                          className="aegis-graph-bar w-2 rounded-full bg-[#f2bd3f]"
                          style={{
                            height: `${percentage(reading.flow, maxFlow)}%`,
                          }}
                        />
                      </div>
                      <span className="truncate text-[10px] font-medium text-zinc-500">
                        {reading.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No sensor readings yet" />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[1.44fr_0.76fr]">
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

          <div className="grid gap-4">
            <Card
              className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="pb-2">
                <CardTitle>Maintenance Plans</CardTitle>
              </CardHeader>
              <CardContent className="gap-4 p-4 pt-0">
                {latestMaintenance.slice(0, 3).map((record) => (
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
          </div>
        </section>

        <section className="grid items-start gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card
            className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Asset Mix</CardTitle>
            </CardHeader>
            <CardContent className="gap-3 p-4 pt-0">
              {assetMixRows.map((category) => {
                return (
                  <PlanRow
                    key={category.category}
                    label={
                      category.category === "Other"
                        ? "Other"
                        : formatEquipmentCategory(category.category)
                    }
                    meta={`${category.count} assets`}
                    value={`${percentage(category.count, totalCategoryCount)}%`}
                    width={percentage(category.count, totalCategoryCount)}
                  />
                );
              })}
              {!assetMixRows.length && <EmptyState label="No asset mix data" />}
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
              {latestAlerts.map((alert) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={alert.id}
                >
                  <div className="flex items-start gap-2">
                    <WarningCircle
                      aria-hidden="true"
                      className="mt-0.5 size-4 text-red-500"
                      weight="fill"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {alert.equipment.assetTag}
                      </p>
                      <p className="line-clamp-2 text-xs text-zinc-500">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!latestAlerts.length && <EmptyState label="No active alerts" />}
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
  value,
}: {
  icon: typeof Bell;
  label: string;
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
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

function LineTrend({
  failurePoints,
  healthPoints,
}: {
  failurePoints: ReturnType<typeof buildLinePoints>;
  healthPoints: ReturnType<typeof buildLinePoints>;
}) {
  return (
    <div className="rounded-[1.1rem] border border-zinc-200 bg-[#f7faf9] p-3">
      <svg
        aria-label="Predictive telemetry trend"
        className="h-72 w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 680 260"
      >
        <defs>
          <linearGradient id="health-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f9da7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2f9da7" stopOpacity="0" />
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
        {healthPoints.area && <path d={healthPoints.area} fill="url(#health-fill)" />}
        <polyline
          className="aegis-line-trace"
          fill="none"
          points={healthPoints.points}
          stroke="#18181b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <polyline
          className="aegis-line-trace aegis-line-trace-delayed"
          fill="none"
          points={failurePoints.points}
          stroke="#2f9da7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {healthPoints.coordinates.map((point) => (
          <circle
            className="aegis-chart-dot"
            cx={point.x}
            cy={point.y}
            fill="#f2bd3f"
            key={`${point.x}-${point.y}`}
            r="4"
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>Health score</span>
        <span>Failure probability</span>
      </div>
    </div>
  );
}

function SignalStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2 shadow-sm ring-1 ring-zinc-950/5">
      <p className="text-[10px] font-semibold uppercase text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function AssetMixRings({
  rows,
  total,
}: {
  rows: Array<{ category: string; count: number }>;
  total: number;
}) {
  const visibleRows = rows.slice(0, 5);

  return (
    <div className="grid place-items-center rounded-[1.1rem] bg-[#f7faf9] p-5">
      <div className="relative grid size-52 place-items-center">
        <svg
          aria-label="Asset mix distribution"
          className="absolute inset-0 size-full -rotate-90"
          role="img"
          viewBox="0 0 220 220"
        >
          {visibleRows
            .map((row, index) => {
              const radius = 92 - index * 14;

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
        {visibleRows.map((row, index) => {
          const share = percentage(row.count, total);
          const radius = 92 - index * 14;
          const circumference = 2 * Math.PI * radius;
          const label =
            row.category === "Other"
              ? "Other"
              : formatEquipmentCategory(row.category);

          return (
            <circle
              className="transition-opacity duration-200 hover:opacity-75"
              cx="110"
              cy="110"
              fill="none"
              key={row.category}
              r={radius}
              stroke={ringColors[index % ringColors.length]}
              strokeDasharray={`${(share / 100) * circumference} ${circumference}`}
              strokeLinecap="round"
              strokeWidth="12"
              style={{
                filter:
                  index === 0
                    ? "drop-shadow(0 8px 16px rgb(24 24 27 / 0.12))"
                    : undefined,
              }}
            >
              <title>{`${label}: ${row.count} assets (${share}%)`}</title>
            </circle>
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

function SignalLoadBars({
  bars,
}: {
  bars: Array<{
    color: string;
    label: string;
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
  const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = coordinates.length
    ? `M ${points.replaceAll(" ", " L ")} L ${width},${height + top} L 0,${height + top} Z`
    : "";

  return {
    area,
    coordinates,
    points,
  };
}
