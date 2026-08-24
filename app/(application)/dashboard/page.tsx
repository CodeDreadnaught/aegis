import type { Metadata } from "next";
import {
  Bell,
  ChartBar,
  Cpu,
  Gauge,
  MagnifyingGlass,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardOverview } from "@/features/dashboard/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Dashboard",
};

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  await requirePermission("viewEquipment");
  const {
    latestAlerts,
    latestMaintenance,
    latestPredictions,
    latestReadings,
    predictionTrend,
    recentActivity,
    stats,
  } = await getDashboardOverview();

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
    .slice(-8)
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
  const heatmapCells = Array.from({ length: 42 }, (_, index) => {
    const prediction = predictionTrend[index % Math.max(1, predictionTrend.length)];
    const probability = prediction
      ? Number(prediction.failureProbability) * 100
      : index % 7 * 8;

    return {
      id: `heat-${index}`,
      intensity: Math.min(100, Math.max(8, probability)),
    };
  });
  const kpis = [
    {
      label: "Fleet",
      value: stats.equipmentCount,
      detail: `${activeRate}% active`,
      icon: Gauge,
      variant: "bg-zinc-950 text-white",
    },
    {
      label: "AI Coverage",
      value: `${predictionCoverage}%`,
      detail: `${predictedAssetCoverage} assets`,
      icon: Cpu,
      variant: "bg-white text-zinc-950",
    },
    {
      label: "Health",
      value: latestPredictions.length ? `${Math.round(averageHealth)}%` : "N/A",
      detail: `${modelScore}% model score`,
      icon: Pulse,
      variant: "bg-emerald-50 text-emerald-900",
    },
    {
      label: "Open Risk",
      value: interventionLoad,
      detail: `${stats.activeAlertCount} alerts`,
      icon: ShieldWarning,
      variant: "bg-red-50 text-red-900",
    },
  ];

  return (
    <PremiumMotion profile="dashboard">
      <div className="grid gap-4">
        <section className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="min-w-0" data-motion="reveal">
            <p className="text-sm font-medium text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
              Equipment Intelligence
            </h1>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm"
            data-motion="reveal"
          >
            {["Live", "7D", "30D"].map((item, index) => (
              <span
                className={
                  index === 0
                    ? "rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full px-4 py-2 text-sm font-medium text-zinc-500"
                }
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                      <p className="mt-3 text-4xl font-semibold tracking-normal text-zinc-950">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`grid size-10 place-items-center rounded-full ${kpi.variant}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-zinc-500">{kpi.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Prediction Trend</CardTitle>
                <p className="text-sm text-zinc-500">Health and failure risk</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {predictionTrend.length} samples
              </Badge>
            </CardHeader>
            <CardContent className="gap-4 p-4 pt-0">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <svg
                  aria-label="Prediction trend"
                  className="h-72 w-full overflow-visible"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 640 260"
                >
                  <defs>
                    <linearGradient id="health-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#18181b" stopOpacity="0.16" />
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
                      x2="640"
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
                    stroke="#ef4444"
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
              <CardTitle>Risk Score</CardTitle>
              <p className="text-sm text-zinc-500">Current prediction mix</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-[13rem_1fr] xl:grid-cols-1">
                <div className="relative mx-auto grid size-48 place-items-center rounded-full bg-zinc-100">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#18181b ${modelScore}%, #f4f4f5 0)`,
                    }}
                  />
                  <div className="relative grid size-36 place-items-center rounded-full bg-white shadow-inner">
                    <div className="text-center">
                      <p className="text-5xl font-semibold tracking-normal">
                        {modelScore}
                      </p>
                      <p className="text-xs font-medium text-zinc-500">Score</p>
                    </div>
                  </div>
                </div>
                <div className="grid content-center gap-3">
                  <RiskRow label="Low" value={stats.riskCounts.low} tone="bg-emerald-500" />
                  <RiskRow label="Medium" value={stats.riskCounts.medium} tone="bg-zinc-950" />
                  <RiskRow label="High" value={stats.riskCounts.high} tone="bg-red-500" />
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-medium text-zinc-500">High Risk</p>
                    <p className="mt-1 text-2xl font-semibold text-zinc-950">
                      {highRiskShare}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.8fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Sensor Stack</CardTitle>
              <p className="text-sm text-zinc-500">Vibration, pressure, flow</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex h-64 items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 pb-4 pt-5">
                {signalBars.map((reading) => (
                  <div
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    key={reading.id}
                  >
                    <div className="flex h-48 w-full max-w-10 items-end justify-center gap-1">
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
                        className="aegis-graph-bar w-2 rounded-full bg-sky-200"
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

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Risk Heatmap</CardTitle>
                <p className="text-sm text-zinc-500">Model intensity</p>
              </div>
              <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-7 gap-2">
                {heatmapCells.map((cell) => (
                  <span
                    aria-hidden="true"
                    className="aegis-heat-cell aspect-square rounded-md border border-zinc-200"
                    key={cell.id}
                    style={{
                      backgroundColor: heatColor(cell.intensity),
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Low" value={stats.riskCounts.low} />
                <MiniStat label="Med" value={stats.riskCounts.medium} />
                <MiniStat label="High" value={stats.riskCounts.high} />
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Operations</CardTitle>
              <p className="text-sm text-zinc-400">Immediate focus</p>
            </CardHeader>
            <CardContent className="gap-3 p-4 pt-0">
              <FocusItem
                icon={Bell}
                label="Alerts"
                value={stats.activeAlertCount}
              />
              <FocusItem
                icon={Wrench}
                label="Maintenance"
                value={stats.maintenanceDueCount}
              />
              <FocusItem
                icon={TrendUp}
                label="Failure Avg"
                value={`${Math.round(averageFailureProbability)}%`}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <div>
                <CardTitle>Asset Performance</CardTitle>
                <p className="text-sm text-zinc-500">Latest predictions</p>
              </div>
              <div className="hidden h-9 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500 sm:flex">
                <MagnifyingGlass aria-hidden="true" className="size-3.5" />
                Filter
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50/70">
                      <TableHead>Asset</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestPredictions.map((prediction) => (
                      <TableRow
                        className="border-zinc-100 transition-colors hover:bg-zinc-50"
                        key={prediction.id}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-zinc-950">
                              {prediction.equipment.assetTag}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {prediction.equipment.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {formatEquipmentCategory(prediction.equipment.category)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                              <span
                                className="block h-full rounded-full bg-zinc-950"
                                style={{
                                  width: `${Number(prediction.healthScore)}%`,
                                }}
                              />
                            </span>
                            <span className="text-sm font-medium">
                              {Number(prediction.healthScore)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RiskBadge risk={prediction.riskLevel} />
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {compactDateFormatter.format(prediction.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card
              className="rounded-lg border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="pb-2">
                <CardTitle>Alerts</CardTitle>
              </CardHeader>
              <CardContent className="gap-2 p-4 pt-0">
                {latestAlerts.length ? (
                  latestAlerts.map((alert) => (
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
                  ))
                ) : (
                  <EmptyState label="No active alerts" />
                )}
              </CardContent>
            </Card>

            <Card
              className="rounded-lg border-zinc-200 bg-white shadow-sm"
              data-motion="panel"
            >
              <CardHeader className="pb-2">
                <CardTitle>Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="gap-2 p-4 pt-0">
                {latestMaintenance.slice(0, 4).map((record) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    key={record.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {record.equipment.assetTag}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {record.status.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {compactDateFormatter.format(record.performedAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
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
                  <div className="grid gap-2" key={category.category}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-zinc-700">
                        {formatEquipmentCategory(category.category)}
                      </span>
                      <span className="text-zinc-500">{category.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-950"
                        style={{
                          width: `${percentage(category.count, total)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2">
              {recentActivity.map((activity) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={activity.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {activity.type}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {activity.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-zinc-500">
                      {timeFormatter.format(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </PremiumMotion>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function FocusItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/8 p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-white text-zinc-950">
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <span className="text-sm text-zinc-300">{label}</span>
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

function RiskBadge({ risk }: { risk: string }) {
  const className =
    risk === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : risk === "MEDIUM"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {risk}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
      {label}
    </div>
  );
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
  const width = 640;
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

function heatColor(intensity: number) {
  if (intensity > 70) {
    return "rgb(239 68 68 / 0.78)";
  }

  if (intensity > 42) {
    return "rgb(24 24 27 / 0.82)";
  }

  if (intensity > 22) {
    return "rgb(134 239 172 / 0.82)";
  }

  return "rgb(244 244 245)";
}
