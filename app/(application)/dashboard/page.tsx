import type { Metadata } from "next";
import {
  Bell,
  ChartBar,
  ChartLineUp,
  Cpu,
  Database,
  Gauge,
  Pulse,
  ShieldWarning,
  TrendUp,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { PremiumMotion } from "@/components/motion/premium-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

  const totalRisk =
    stats.riskCounts.low + stats.riskCounts.medium + stats.riskCounts.high;
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
  const readingBars = latestReadings
    .slice()
    .reverse()
    .map((reading) => ({
      id: reading.id,
      label: reading.equipment.assetTag.replace("AEG-", ""),
      vibration: readParameter(reading.parameters, "vibrationMmS"),
      pressure: readParameter(reading.parameters, "pressureBar"),
      flow: readParameter(reading.parameters, "flowRateBpd"),
    }));
  const maxVibration = Math.max(
    1,
    ...readingBars.map((reading) => reading.vibration)
  );
  const maxPressure = Math.max(1, ...readingBars.map((reading) => reading.pressure));
  const maxFlow = Math.max(1, ...readingBars.map((reading) => reading.flow));
  const categoryTotal = stats.categoryCounts.reduce(
    (sum, category) => sum + category.count,
    0
  );
  const riskSegments = [
    {
      label: "Low",
      value: stats.riskCounts.low,
      className: "bg-emerald-400",
    },
    {
      label: "Medium",
      value: stats.riskCounts.medium,
      className: "bg-zinc-950",
    },
    {
      label: "High",
      value: stats.riskCounts.high,
      className: "bg-red-500",
    },
  ];
  const kpis = [
    {
      label: "Fleet Availability",
      value: `${activeRate}%`,
      detail: `${stats.activeEquipmentCount} of ${stats.equipmentCount} assets active`,
      icon: Gauge,
      tone: "bg-zinc-950 text-white",
    },
    {
      label: "AI Coverage",
      value: `${predictionCoverage}%`,
      detail: `${predictedAssetCoverage} assets with recent predictions`,
      icon: Cpu,
      tone: "bg-white text-zinc-950",
    },
    {
      label: "Avg Health",
      value: latestPredictions.length ? `${Math.round(averageHealth)}%` : "N/A",
      detail: "Latest stored model outputs",
      icon: Pulse,
      tone: "bg-emerald-50 text-emerald-900",
    },
    {
      label: "Intervention Load",
      value: interventionLoad,
      detail: `${stats.activeAlertCount} alerts / ${stats.maintenanceDueCount} maintenance`,
      icon: ShieldWarning,
      tone: "bg-red-50 text-red-900",
    },
  ];

  return (
    <PremiumMotion profile="dashboard">
      <section className="mb-5 grid gap-4 xl:grid-cols-[1fr_auto]">
        <div data-motion="reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            AI Operations Console
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-zinc-950 md:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
            Monitor upstream equipment health, prediction confidence,
            maintenance exposure and active operational risk from verified AEGIS
            records.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm"
          data-motion="reveal"
        >
          <div className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Database aria-hidden="true" className="size-4" weight="fill" />
          </div>
          <div className="pr-2">
            <p className="text-sm font-semibold text-zinc-950">Live dataset</p>
            <p className="text-xs text-zinc-500">
              {latestReadings.length} recent sensor readings
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Card
              className="overflow-hidden rounded-lg border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
              data-motion="metric"
              key={kpi.label}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                      {kpi.label}
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-normal text-zinc-950">
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`grid size-10 place-items-center rounded-full ${kpi.tone}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-500">{kpi.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Predictive Performance</CardTitle>
              <CardDescription>
                Health, vibration, pressure and flow trends from recent readings
                and model outputs.
              </CardDescription>
            </div>
            <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700" variant="outline">
              {predictionTrend.length} samples
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      Sensor Signal Stack
                    </p>
                    <p className="text-xs text-zinc-500">
                      Vibration, pressure and flow by asset
                    </p>
                  </div>
                  <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
                </div>
                <div className="flex h-64 items-end gap-2 overflow-hidden rounded-md border border-white bg-white/80 px-3 pb-4 pt-5">
                  {readingBars.length ? (
                    readingBars.map((reading) => (
                      <div
                        className="flex min-w-8 flex-1 flex-col items-center justify-end gap-1"
                        key={reading.id}
                      >
                        <div className="flex h-48 w-full items-end justify-center gap-1">
                          <span
                            className="w-2 rounded-t-full bg-zinc-950"
                            style={{
                              height: `${scale(reading.vibration, maxVibration, 18, 100)}%`,
                            }}
                          />
                          <span
                            className="w-2 rounded-t-full bg-emerald-300"
                            style={{
                              height: `${scale(reading.pressure, maxPressure, 18, 100)}%`,
                            }}
                          />
                          <span
                            className="w-2 rounded-t-full bg-zinc-300"
                            style={{
                              height: `${scale(reading.flow, maxFlow, 18, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="max-w-14 truncate text-[10px] font-medium text-zinc-400">
                          {reading.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="No operational readings are available yet." />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <LegendItem className="bg-zinc-950" label="Vibration" />
                  <LegendItem className="bg-emerald-300" label="Pressure" />
                  <LegendItem className="bg-zinc-300" label="Flow" />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border border-zinc-100 bg-zinc-950 p-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Failure Probability</p>
                      <p className="mt-1 text-xs text-white/55">
                        Average across latest model outputs
                      </p>
                    </div>
                    <TrendUp aria-hidden="true" className="size-5 text-emerald-300" />
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <p className="text-5xl font-semibold tracking-normal">
                      {latestPredictions.length
                        ? `${Math.round(averageFailureProbability)}%`
                        : "N/A"}
                    </p>
                    <div className="flex h-24 items-end gap-1">
                      {predictionTrend.length ? (
                        predictionTrend
                          .slice()
                          .reverse()
                          .map((prediction) => (
                            <span
                              className="w-2 rounded-full bg-white/80"
                              key={prediction.id}
                              style={{
                                height: `${scale(
                                  Number(prediction.failureProbability) * 100,
                                  100,
                                  18,
                                  100
                                )}%`,
                              }}
                            />
                          ))
                      ) : (
                        <span className="text-xs text-white/55">No trend</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-100 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-950">
                      Risk Distribution
                    </p>
                    <WarningCircle aria-hidden="true" className="size-5 text-zinc-500" />
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
                    {riskSegments.map((segment) => (
                      <span
                        aria-label={`${segment.label} risk ${segment.value}`}
                        className={segment.className}
                        key={segment.label}
                        style={{
                          width: `${totalRisk ? Math.max((segment.value / totalRisk) * 100, segment.value ? 8 : 0) : 0}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {riskSegments.map((segment) => (
                      <div
                        className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                        key={segment.label}
                      >
                        <p className="text-xs text-zinc-500">{segment.label}</p>
                        <p className="mt-1 text-xl font-semibold text-zinc-950">
                          {segment.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader>
            <CardTitle>Asset Intelligence</CardTitle>
            <CardDescription>
              Equipment mix and maintenance status at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              {stats.categoryCounts.slice(0, 6).map((category) => (
                <div className="grid gap-2" key={category.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-700">
                      {formatEquipmentCategory(category.category)}
                    </span>
                    <span className="text-zinc-500">{category.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <span
                      className="block h-full rounded-full bg-zinc-950"
                      style={{
                        width: `${categoryTotal ? (category.count / categoryTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStatusCard
                label="Planned"
                value={statusCount(stats.maintenanceStatusCounts, "PLANNED")}
              />
              <MiniStatusCard
                label="In Progress"
                value={statusCount(stats.maintenanceStatusCounts, "IN_PROGRESS")}
              />
              <MiniStatusCard
                label="Completed"
                value={statusCount(stats.maintenanceStatusCounts, "COMPLETED")}
              />
              <MiniStatusCard
                label="Deferred"
                value={statusCount(stats.maintenanceStatusCounts, "DEFERRED")}
              />
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-950">
                Maintenance Load
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-full bg-white text-zinc-950 shadow-sm">
                  <Wrench aria-hidden="true" className="size-7" weight="fill" />
                </div>
                <div>
                  <p className="text-4xl font-semibold tracking-normal">
                    {stats.maintenanceDueCount}
                  </p>
                  <p className="text-xs text-zinc-500">
                    planned or active tasks
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Prediction Queue</CardTitle>
              <CardDescription>
                Highest priority stored model outputs for operational review.
              </CardDescription>
            </div>
            <Button className="rounded-full" size="sm" variant="outline">
              <ChartLineUp aria-hidden="true" className="size-4" />
              Review
            </Button>
          </CardHeader>
          <CardContent>
            {latestPredictions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Failure</TableHead>
                    <TableHead>Model</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestPredictions.map((prediction) => (
                    <TableRow key={prediction.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-zinc-950">
                            {prediction.equipment.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {prediction.equipment.assetTag} /{" "}
                            {prediction.equipment.location}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={riskBadgeClass(prediction.riskLevel)}
                          variant="outline"
                        >
                          {formatEquipmentCategory(prediction.riskLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-28">
                          <div className="flex items-center justify-between text-xs">
                            <span>{Number(prediction.healthScore)}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <span
                              className="block h-full rounded-full bg-zinc-950"
                              style={{
                                width: `${clamp(Number(prediction.healthScore), 0, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {Math.round(Number(prediction.failureProbability) * 100)}%
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {prediction.modelVersion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="No prediction outputs are stored yet. Run the approved ONNX workflow once model artefacts are available." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Latest alert stream from equipment and model events.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {latestAlerts.length ? (
                latestAlerts.map((alert) => (
                  <div
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                    key={alert.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-zinc-950 shadow-sm">
                        <Bell aria-hidden="true" className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={severityBadgeClass(alert.severity)}
                            variant="outline"
                          >
                            {formatEquipmentCategory(alert.severity)}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {compactDateFormatter.format(alert.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-zinc-950">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {alert.equipment.assetTag} / {alert.equipment.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No active alert records are available." />
              )}
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest readings, maintenance and alert events.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {recentActivity.length ? (
                recentActivity.map((activity) => (
                  <div className="flex gap-3" key={activity.id}>
                    <span className="mt-1 size-2 rounded-full bg-zinc-950" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        {activity.type}
                      </p>
                      <p className="text-sm leading-6 text-zinc-500">
                        {activity.detail}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="Operational activity will appear here as readings, maintenance records and alerts are captured." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-4">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader>
            <CardTitle>Maintenance Schedule</CardTitle>
            <CardDescription>
              Recent maintenance records and upcoming due dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestMaintenance.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {latestMaintenance.slice(0, 4).map((record) => (
                  <div
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
                    key={record.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          {record.type}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {record.equipment.assetTag}
                        </p>
                      </div>
                      <Badge
                        className="rounded-full border-zinc-200 bg-white text-zinc-700"
                        variant="outline"
                      >
                        {formatEquipmentCategory(record.status)}
                      </Badge>
                    </div>
                    <p className="mt-5 text-sm text-zinc-500">
                      {record.equipment.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Due{" "}
                      {record.nextDueDate
                        ? compactDateFormatter.format(record.nextDueDate)
                        : "not scheduled"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No maintenance records are available." />
            )}
          </CardContent>
        </Card>
      </section>
    </PremiumMotion>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function MiniStatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
      {message}
    </div>
  );
}

function riskBadgeClass(riskLevel: string) {
  if (riskLevel === "LOW") {
    return "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (riskLevel === "MEDIUM") {
    return "rounded-full border-zinc-300 bg-zinc-100 text-zinc-800";
  }

  return "rounded-full border-red-200 bg-red-50 text-red-700";
}

function severityBadgeClass(severity: string) {
  if (severity === "INFO") {
    return "rounded-full border-zinc-200 bg-white text-zinc-600";
  }

  if (severity === "MEDIUM") {
    return "rounded-full border-amber-200 bg-amber-50 text-amber-700";
  }

  return "rounded-full border-red-200 bg-red-50 text-red-700";
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scale(value: number, max: number, minPercent: number, maxPercent: number) {
  if (!max) {
    return minPercent;
  }

  return clamp((value / max) * maxPercent, minPercent, maxPercent);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function statusCount(counts: Record<string, number>, status: string) {
  return counts[status] ?? 0;
}
