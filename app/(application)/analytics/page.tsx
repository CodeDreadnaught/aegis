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
  title: "Predictive Analytics",
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

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  await requirePermission("runPrediction");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const { predictions, readingCount, readings } =
    await getAnalyticsWorkspace(page);
  const predictedReadingCount = readings.filter(
    reading => reading.predictions.length > 0,
  ).length;
  const pendingJobCount = readings.filter(
    reading =>
      reading.predictionJob?.status === "PENDING" ||
      reading.predictionJob?.status === "PROCESSING",
  ).length;
  const readiness = percentage(predictedReadingCount, readings.length);
  const averageHealth = average(
    predictions.map(prediction => Number(prediction.healthScore)),
  );
  const averageFailure = average(
    predictions.map(prediction => Number(prediction.failureProbability) * 100),
  );
  const modelConfidence = predictions.length
    ? Math.max(0, Math.round(100 - averageFailure))
    : 0;
  const riskCounts = predictions.reduce(
    (summary, prediction) => {
      summary[prediction.riskLevel.toLowerCase() as keyof typeof summary] += 1;
      return summary;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const trendPredictions = predictions.slice().reverse().slice(-8);
  const trendPoints = buildLinePoints(
    trendPredictions.map(
      prediction => Number(prediction.failureProbability) * 100,
    ),
  );
  const latestHighRisk = predictions.filter(
    prediction => prediction.riskLevel === "HIGH",
  ).length;
  const kpis = [
    {
      accent: "bg-[#2f9da7]",
      detail: pendingJobCount ? `${pendingJobCount} jobs pending` : "Queue clear",
      tone: "bg-[#e8fbf6] text-[#146c74]",
      icon: Brain,
      label: "Inference",
      value: readingCount,
    },
    {
      accent: "bg-[#5ec3cf]",
      detail: "Queue coverage",
      tone: "bg-[#eefbfc] text-[#146c74]",
      icon: Cpu,
      label: "Readiness",
      value: `${readiness}%`,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: predictions.length ? "Average health" : "No predictions",
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      icon: Pulse,
      label: "Health",
      value: predictions.length ? `${Math.round(averageHealth)}%` : "N/A",
    },
    {
      accent: "bg-[#ef4444]",
      detail: latestHighRisk ? "High risk" : "No high risk",
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      icon: ShieldWarning,
      label: "Risk",
      value: `${Math.round(averageFailure)}%`,
    },
  ];

  return (
    <PremiumMotion profile="overview">
      <div className="grid w-full max-w-full min-w-0 gap-4">
        <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0" data-motion="reveal">
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
          {kpis.map(kpi => (
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
            className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="min-w-0">
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
            <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-3">
              {predictions.slice(0, 8).map(prediction => (
                <Link
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  href={`/equipment/view-more/${prediction.equipment.id}`}
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
                    <span>
                      {compactDateFormatter.format(prediction.createdAt)}
                    </span>
                  </div>
                  {prediction.recommendations[0] && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {prediction.recommendations[0].message}
                    </p>
                  )}
                </Link>
              ))}
              {!predictions.length && (
                <EmptyState label="No predictions stored" />
              )}
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
      className="h-full w-full max-w-full min-w-0 rounded-[1.2rem] border-zinc-200 bg-white py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="flex min-h-36 flex-col px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-auto pt-3 text-sm font-medium text-zinc-500">
          {detail}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full ${accent}`} />
        </div>
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
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  ) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function average(values: number[]) {
  const validValues = values.filter(value => Number.isFinite(value));

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

function buildLinePoints(values: number[]) {
  if (!values.length) {
    return "";
  }

  return values
    .map((value, index) => {
      const boundedValue = Math.min(Math.max(value, 0), 100);
      const x = values.length === 1 ? 320 : 48 + (index / (values.length - 1)) * 544;
      const y = 190 - (boundedValue / 100) * 160;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
