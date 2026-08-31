import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  ChartLineUp,
  Cpu,
  Gauge,
  Pulse,
  ShieldWarning,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { PaginationControls } from "@/components/table-pagination";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runPredictionAction } from "@/features/analytics/actions";
import { getAnalyticsWorkspace } from "@/features/analytics/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { formatSourceType } from "@/features/operational-readings/validation";
import { parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Predictive Analytics",
};

export const runtime = "nodejs";

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

type AnalyticsPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requirePermission("runPrediction");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const { predictions, readingCount, readings } = await getAnalyticsWorkspace(page);
  const predictedReadingCount = readings.filter(
    (reading) => reading.predictions.length > 0
  ).length;
  const pendingJobCount = readings.filter(
    (reading) =>
      reading.predictionJob?.status === "PENDING" ||
      reading.predictionJob?.status === "PROCESSING"
  ).length;
  const readiness = percentage(predictedReadingCount, readings.length);
  const averageHealth = average(
    predictions.map((prediction) => Number(prediction.healthScore))
  );
  const averageFailure = average(
    predictions.map((prediction) => Number(prediction.failureProbability) * 100)
  );
  const modelConfidence = predictions.length
    ? Math.max(0, Math.round(100 - averageFailure))
    : 0;
  const riskCounts = predictions.reduce(
    (summary, prediction) => {
      summary[prediction.riskLevel.toLowerCase() as keyof typeof summary] += 1;
      return summary;
    },
    { low: 0, medium: 0, high: 0 }
  );
  const trendPredictions = predictions.slice().reverse().slice(-8);
  const trendPoints = buildLinePoints(
    trendPredictions.map(
      (prediction) => Number(prediction.failureProbability) * 100
    )
  );
  const latestHighRisk = predictions.filter(
    (prediction) => prediction.riskLevel === "HIGH"
  ).length;
  const kpis = [
    {
      detail: `${pendingJobCount} jobs pending`,
      icon: Brain,
      label: "Inference",
      value: readingCount,
    },
    {
      detail: `${readiness}% queue coverage`,
      icon: Cpu,
      label: "Readiness",
      value: `${readiness}%`,
    },
    {
      detail: predictions.length ? "Average health" : "No predictions",
      icon: Pulse,
      label: "Health",
      value: predictions.length ? `${Math.round(averageHealth)}%` : "N/A",
    },
    {
      detail: `${latestHighRisk} high risk`,
      icon: ShieldWarning,
      label: "Risk",
      value: `${Math.round(averageFailure)}%`,
    },
  ];

  return (
    <PremiumMotion profile="overview">
      <div className="grid gap-4">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div data-motion="reveal">
            <p className="text-sm font-medium text-zinc-500">
              Predictive Analytics
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
              AI Inference
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Convert operational readings into failure probability, health
              score, risk level and maintenance recommendations for upstream
              equipment.
            </p>
          </div>
        </section>

        <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
          {kpis.map((kpi) => (
            <MetricCard
              detail={kpi.detail}
              icon={kpi.icon}
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
            />
          ))}
        </section>

        <section>
          <Card
            className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Inference Queue</CardTitle>
                <p className="text-sm text-zinc-500">
                  Operational readings ready for model execution
                </p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {readingCount} readings
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {readings.length ? (
                <>
                  <div className="px-4 pb-4">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead className="w-[24%]">Equipment</TableHead>
                        <TableHead className="hidden text-center md:table-cell">
                          Recorded
                        </TableHead>
                        <TableHead className="hidden w-[13%] text-center lg:table-cell">
                          Source
                        </TableHead>
                        <TableHead className="hidden w-[17%] text-center xl:table-cell">
                          Signal
                        </TableHead>
                        <TableHead className="w-[12%] text-center">Latest</TableHead>
                        <TableHead className="hidden w-[11%] text-center lg:table-cell">
                          Job
                        </TableHead>
                        <TableHead className="w-[9%] text-center">Run</TableHead>
                        <TableHead className="w-[10%] text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading) => {
                        const latestPrediction = reading.predictions[0];

                        return (
                          <TableRow
                            className="border-zinc-100 transition-colors hover:bg-zinc-50"
                            key={reading.id}
                          >
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-950">
                                  {reading.equipment.assetTag}
                                </p>
                                <p className="truncate text-xs text-zinc-500">
                                  {reading.equipment.name}
                                </p>
                                <p className="truncate text-xs text-zinc-400">
                                  {reading.equipment.location}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-center md:table-cell">
                              <p className="font-medium text-zinc-950">
                                {compactDateFormatter.format(reading.recordedAt)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {timeFormatter.format(reading.recordedAt)}
                              </p>
                            </TableCell>
                            <TableCell className="hidden text-center lg:table-cell">
                              <Badge
                                className="max-w-full rounded-full border-zinc-200 bg-white text-zinc-700"
                                variant="outline"
                              >
                                <span className="truncate">
                                  {formatSourceType(reading.sourceType)}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-center xl:table-cell">
                              <SignalStack parameters={reading.parameters} />
                            </TableCell>
                            <TableCell className="text-center">
                              {latestPrediction ? (
                                <div className="inline-grid justify-items-center gap-1">
                                  <RiskBadge riskLevel={latestPrediction.riskLevel} />
                                  <span className="text-xs font-medium text-zinc-500">
                                    {latestPrediction.healthScore.toString()}%
                                    health
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-zinc-400">
                                  Not run
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-center lg:table-cell">
                              <PredictionJobBadge
                                attempts={reading.predictionJob?.attempts ?? 0}
                                status={
                                  latestPrediction
                                    ? "COMPLETED"
                                    : reading.predictionJob?.status
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <ActionToastForm
                                action={runPredictionAction.bind(null, reading.id)}
                                errorTitle="Prediction was not run"
                                successDescription="The model output and recommendation were saved."
                                successTitle="Prediction complete"
                              >
                                <button
                                  className={buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                    className:
                                      "rounded-full border-zinc-200 bg-white px-3 text-zinc-950 hover:bg-zinc-950 hover:text-white",
                                  })}
                                  type="submit"
                                >
                                  <Brain />
                                  Run
                                </button>
                              </ActionToastForm>
                            </TableCell>
                            <TableCell className="text-center">
                              <Link
                                className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                                href={`/equipment/${reading.equipment.id}`}
                              >
                                View more
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  page={page}
                  searchParams={params}
                  total={readingCount}
                />
              </>
              ) : (
                <EmptyState icon={Brain} label="No readings available" />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid items-start gap-4 md:grid-cols-2">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Model Confidence</CardTitle>
                <p className="text-sm text-zinc-500">Failure probability inverse</p>
              </div>
              <Gauge aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="rounded-lg bg-emerald-50 p-4">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-5xl font-semibold leading-none text-zinc-950">
                    {modelConfidence}%
                  </p>
                  <Badge
                    className="rounded-full border-emerald-200 bg-white text-emerald-700"
                    variant="outline"
                  >
                    {predictions.length} runs
                  </Badge>
                </div>
                <span className="mt-5 block h-2 overflow-hidden rounded-full bg-white">
                  <span
                    className="block h-full rounded-full bg-zinc-950"
                    style={{ width: `${modelConfidence}%` }}
                  />
                </span>
                <p className="mt-3 text-xs leading-5 text-emerald-900/70">
                  Higher confidence means recent predictions carry lower average
                  failure probability across the scored readings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Risk Mix</CardTitle>
                <p className="text-sm text-zinc-500">Stored predictions</p>
              </div>
              <ChartLineUp aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              <DistributionRow
                label="Low"
                tone="bg-emerald-500"
                total={predictions.length}
                value={riskCounts.low}
              />
              <DistributionRow
                label="Medium"
                tone="bg-zinc-950"
                total={predictions.length}
                value={riskCounts.medium}
              />
              <DistributionRow
                label="High"
                tone="bg-red-500"
                total={predictions.length}
                value={riskCounts.high}
              />
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Failure Trend</CardTitle>
                <p className="text-sm text-zinc-500">Recent probability output</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {trendPredictions.length} samples
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {trendPredictions.length ? (
                <>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <svg
                    className="h-48 w-full overflow-visible"
                    role="img"
                    viewBox="0 0 640 220"
                  >
                    <title>Failure probability trend</title>
                    {[40, 90, 140, 190].map((y) => (
                      <line
                        key={y}
                        stroke="#e4e4e7"
                        strokeDasharray="6 8"
                        x1="0"
                        x2="640"
                        y1={y}
                        y2={y}
                      />
                    ))}
                    <polyline
                      fill="none"
                      points={trendPoints}
                      stroke="#09090b"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                    />
                    {trendPoints.split(" ").map((point) => {
                      const [x, y] = point.split(",");

                      return (
                        <circle
                          cx={x}
                          cy={y}
                          fill="#09090b"
                          key={point}
                          r="5"
                        />
                      );
                    })}
                  </svg>
                </div>
                <PaginationControls
                  page={page}
                  searchParams={params}
                  total={readingCount}
                />
              </>
              ) : (
                <EmptyState label="No prediction trend yet" />
              )}
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Stored Predictions</CardTitle>
                <p className="text-sm text-zinc-500">Latest model outputs</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {predictions.length} outputs
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {predictions.slice(0, 8).map((prediction) => (
                <Link
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  href={`/equipment/${prediction.equipment.id}`}
                  key={prediction.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {prediction.equipment.assetTag}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {prediction.equipment.name}
                      </p>
                    </div>
                    <RiskBadge riskLevel={prediction.riskLevel} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium text-zinc-500">
                    <span>
                      Pf{" "}
                      {(Number(prediction.failureProbability) * 100).toFixed(1)}
                      %
                    </span>
                    <span>Health {prediction.healthScore.toString()}%</span>
                    <span>{formatEquipmentCategory(prediction.riskLevel)}</span>
                    <span>{compactDateFormatter.format(prediction.createdAt)}</span>
                  </div>
                  {prediction.recommendations[0] && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {prediction.recommendations[0].message}
                    </p>
                  )}
                </Link>
              ))}
              {!predictions.length && <EmptyState label="No predictions stored" />}
            </CardContent>
          </Card>
        </section>
      </div>
    </PremiumMotion>
  );
}

type MetricIcon = typeof Brain;

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: MetricIcon;
  label: string;
  value: number | string;
}) {
  return (
    <Card
      className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className="grid size-8 place-items-center rounded-full bg-zinc-950 text-white">
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-xs font-medium text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SignalStack({ parameters }: { parameters: unknown }) {
  const vibration = readParameter(parameters, "vibrationMmS");
  const pressure = readParameter(parameters, "pressureBar");
  const flow = readParameter(parameters, "flowRateBpd");

  return (
    <div className="mx-auto grid max-w-[12rem] gap-2">
      <SignalRow label="Vib" unit="mm/s" value={vibration} />
      <SignalRow label="Press" unit="bar" value={pressure} />
      <SignalRow label="Flow" unit="bpd" value={flow} />
    </div>
  );
}

function SignalRow({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-950">
        {value ? value.toLocaleString("en-GB") : "N/A"}{" "}
        <span className="font-medium text-zinc-400">{unit}</span>
      </span>
    </div>
  );
}

function DistributionRow({
  label,
  tone,
  total,
  value,
}: {
  label: string;
  tone: string;
  total: number;
  value: number;
}) {
  const width = percentage(value, total);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-950">{label}</span>
        <span className="font-medium text-zinc-500">{value}</span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={`block h-full rounded-full ${tone}`}
          style={{ width: `${width}%` }}
        />
      </span>
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const className =
    riskLevel === "LOW"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : riskLevel === "MEDIUM"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {formatEquipmentCategory(riskLevel)}
    </Badge>
  );
}

function PredictionJobBadge({
  attempts,
  status,
}: {
  attempts: number;
  status?: string;
}) {
  if (!status) {
    return <span className="text-sm text-zinc-400">Not queued</span>;
  }

  const className =
    status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAILED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "PROCESSING"
          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {formatEquipmentCategory(status)}
      {status === "FAILED" && attempts ? ` (${attempts})` : ""}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  label,
}: {
  icon?: MetricIcon;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-4 text-zinc-400" />}
        <span>{label}</span>
      </div>
    </div>
  );
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function buildLinePoints(values: number[]) {
  if (!values.length) {
    return "";
  }

  const max = Math.max(100, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 320 : (index / (values.length - 1)) * 640;
      const y = 190 - ((value - min) / range) * 150;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

