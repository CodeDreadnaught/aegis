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
  DashboardAssetTable,
  type DashboardAssetRow,
} from "@/features/dashboard/dashboard-asset-table";
import { DashboardControls } from "@/features/dashboard/dashboard-controls";
import {
  getDashboardOverview,
  type DashboardRange,
} from "@/features/dashboard/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Dashboard",
};

type DashboardPageProps = {
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

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
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
  } = await getDashboardOverview(range);

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
  const totalRisk =
    stats.riskCounts.low + stats.riskCounts.medium + stats.riskCounts.high;
  const highRiskShare = percentage(stats.riskCounts.high, totalRisk);
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
  const assetRows: DashboardAssetRow[] = latestPredictions.map((prediction) => ({
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
    },
    {
      label: "AI Coverage",
      value: `${predictionCoverage}%`,
      detail: `${predictedAssetCoverage} assets`,
      icon: Cpu,
      tone: "bg-white text-zinc-950",
      delta: `${latestPredictions.length} runs`,
    },
    {
      label: "Health",
      value: latestPredictions.length ? `${Math.round(averageHealth)}%` : "N/A",
      detail: "Average score",
      icon: Pulse,
      tone: "bg-emerald-50 text-emerald-900",
      delta: `${modelScore}% stable`,
    },
    {
      label: "Risk",
      value: interventionLoad,
      detail: `${stats.activeAlertCount} alerts`,
      icon: ShieldWarning,
      tone: "bg-red-50 text-red-900",
      delta: `${stats.maintenanceDueCount} jobs`,
    },
  ];

  return (
    <PremiumMotion profile="dashboard">
      <div className="grid gap-4">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div data-motion="reveal">
            <p className="text-sm font-medium text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
              Equipment Intelligence
            </h1>
          </div>
          <div data-motion="reveal">
            <DashboardControls activeRange={String(range)} />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.92fr_0.75fr]">
          <div className="grid gap-3 md:grid-cols-2">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;

              return (
                <Card
                  className="rounded-lg border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
                  data-motion="metric"
                  key={kpi.label}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-500">
                          {kpi.label}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                          {kpi.value}
                        </p>
                      </div>
                      <div
                        className={`grid size-9 place-items-center rounded-full ${kpi.tone}`}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500">{kpi.detail}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        {kpi.delta}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Risk Breakdown</CardTitle>
                <p className="text-sm text-zinc-500">Prediction distribution</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {range}D
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-[13rem_1fr] xl:grid-cols-1">
              <div className="relative mx-auto grid size-48 place-items-center">
                <Ring value={percentage(stats.riskCounts.low, totalRisk)} tone="#86efac" />
                <Ring
                  inset="inset-5"
                  value={percentage(stats.riskCounts.medium, totalRisk)}
                  tone="#18181b"
                />
                <Ring
                  inset="inset-10"
                  value={percentage(stats.riskCounts.high, totalRisk)}
                  tone="#ef4444"
                />
                <div className="relative grid size-24 place-items-center rounded-full bg-white shadow-inner">
                  <div className="text-center">
                    <p className="text-3xl font-semibold">{highRiskShare}%</p>
                    <p className="text-[11px] font-medium text-zinc-500">High</p>
                  </div>
                </div>
              </div>
              <div className="grid content-center gap-3">
                <RiskRow label="Low" value={stats.riskCounts.low} tone="bg-emerald-400" />
                <RiskRow label="Medium" value={stats.riskCounts.medium} tone="bg-zinc-950" />
                <RiskRow label="High" value={stats.riskCounts.high} tone="bg-red-500" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card
              className="rounded-lg border-zinc-200 bg-emerald-50 shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle>AI Score</CardTitle>
                  <p className="text-sm text-emerald-800/70">Model confidence</p>
                </div>
                <ChartLineUp
                  aria-hidden="true"
                  className="size-5 text-emerald-800"
                />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-5xl font-semibold tracking-normal text-zinc-950">
                  {modelScore}%
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-zinc-950"
                    style={{ width: `${modelScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-lg border-zinc-200 bg-white shadow-sm"
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

        <section className="grid gap-4 xl:grid-cols-[1.48fr_0.72fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
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
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <svg
                  aria-label="Telemetry flow"
                  className="h-72 w-full overflow-visible"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 680 260"
                >
                  <defs>
                    <linearGradient id="health-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#18181b" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#18181b" stopOpacity="0" />
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
                  {healthPoints.area && (
                    <path d={healthPoints.area} fill="url(#health-fill)" />
                  )}
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
                    stroke="#86efac"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  {healthPoints.coordinates.map((point) => (
                    <circle
                      className="aegis-chart-dot"
                      cx={point.x}
                      cy={point.y}
                      fill="#18181b"
                      key={`${point.x}-${point.y}`}
                      r="4"
                    />
                  ))}
                </svg>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Health</span>
                  <span>Failure Risk</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Sensor Stack</CardTitle>
              <p className="text-sm text-zinc-500">Vibration, pressure, flow</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
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
                        className="aegis-graph-bar w-2 rounded-full bg-emerald-300"
                        style={{
                          height: `${percentage(reading.pressure, maxPressure)}%`,
                        }}
                      />
                      <span
                        className="aegis-graph-bar w-2 rounded-full bg-zinc-300"
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
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.44fr_0.76fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Asset Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DashboardAssetTable rows={assetRows} />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card
              className="rounded-lg border-zinc-200 bg-white shadow-sm"
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
              className="rounded-lg border-zinc-200 bg-white shadow-sm"
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
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
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

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Asset Mix</CardTitle>
            </CardHeader>
            <CardContent className="gap-3 p-4 pt-0">
              {stats.categoryCounts.map((category) => {
                const total = Math.max(
                  1,
                  stats.categoryCounts.reduce((sum, item) => sum + item.count, 0)
                );

                return (
                  <PlanRow
                    key={category.category}
                    label={formatEquipmentCategory(category.category)}
                    meta={`${category.count} assets`}
                    value={`${percentage(category.count, total)}%`}
                    width={percentage(category.count, total)}
                  />
                );
              })}
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

function Ring({
  inset = "inset-0",
  tone,
  value,
}: {
  inset?: string;
  tone: string;
  value: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`absolute ${inset} rounded-full aegis-ring-sweep`}
      style={{
        background: `conic-gradient(${tone} ${value}%, #edf7e9 0)`,
      }}
    />
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

function RiskRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${tone}`} />
        <span className="text-sm font-medium text-zinc-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-zinc-950">{value}</span>
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

function parseRange(value: string | string[] | undefined): DashboardRange {
  const range = Array.isArray(value) ? value[0] : value;

  if (range === "1" || range === "7" || range === "30") {
    return Number(range) as DashboardRange;
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
