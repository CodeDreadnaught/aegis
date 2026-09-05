import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  ChartLineUp,
  Cpu,
  Gauge,
  MagnifyingGlass,
  Pulse,
  ShieldWarning,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { PaginationControls } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runPredictionAction } from "@/features/analytics/actions";
import {
  getAnalyticsWorkspace,
  storedPredictionPageSize,
  type AnalyticsJobFilter,
  type AnalyticsLatestFilter,
} from "@/features/analytics/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { formatSourceType } from "@/features/operational-readings/validation";
import { PredictionJobStatus, RiskLevel } from "@/generated/prisma/enums";
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

const riskRows = [
  {
    accent: "bg-[#2f9da7]",
    key: "low",
    label: "Low",
    tone: "border-[#b8eee7] bg-[#e8fbf6] text-[#146c74]",
  },
  {
    accent: "bg-[#f2bd3f]",
    key: "medium",
    label: "Medium",
    tone: "border-[#ffe39a] bg-[#fff6dc] text-[#8a5a00]",
  },
  {
    accent: "bg-[#ef4444]",
    key: "high",
    label: "High",
    tone: "border-[#fecaca] bg-[#fff0ed] text-[#b13d2e]",
  },
] as const;

const jobFilters: Array<{ label: string; value: "" | AnalyticsJobFilter }> = [
  { label: "All jobs", value: "" },
  { label: "Not queued", value: "NOT_QUEUED" },
  { label: "Pending", value: PredictionJobStatus.PENDING },
  { label: "Processing", value: PredictionJobStatus.PROCESSING },
  { label: "Completed", value: PredictionJobStatus.COMPLETED },
  { label: "Failed", value: PredictionJobStatus.FAILED },
];

const latestFilters: Array<{
  label: string;
  value: "" | AnalyticsLatestFilter;
}> = [
  { label: "All latest", value: "" },
  { label: "Not run", value: "NOT_RUN" },
  { label: "Low", value: RiskLevel.LOW },
  { label: "Medium", value: RiskLevel.MEDIUM },
  { label: "High", value: RiskLevel.HIGH },
];

type AnalyticsPageProps = {
  searchParams?: Promise<{
    job?: string | string[];
    latest?: string | string[];
    page?: string | string[];
    predictionPage?: string | string[];
    q?: string | string[];
  }>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  await requirePermission("runPrediction");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const predictionPage = parsePageParam(params?.predictionPage);
  const query = getParam(params?.q)?.trim() ?? "";
  const job = parseJobFilter(params?.job);
  const latest = parseLatestFilter(params?.latest);
  const {
    currentPredictionPage,
    pendingJobCount,
    predictedReadingCount,
    predictionCount,
    predictions,
    readingCount,
    readings,
    riskTotals,
    storedPredictionCount,
    summaryPredictions,
    totalReadingCount,
    trendPredictions,
  } = await getAnalyticsWorkspace(page, {
    job,
    latest,
    predictionPage,
    query,
  });

  const readiness = percentage(predictedReadingCount, totalReadingCount);
  const averageHealth = average(
    summaryPredictions.map(prediction => Number(prediction.healthScore)),
  );
  const averageFailure = average(
    summaryPredictions.map(
      prediction => Number(prediction.failureProbability) * 100,
    ),
  );
  const modelConfidence = summaryPredictions.length
    ? Math.max(0, Math.round(100 - averageFailure))
    : 0;
  const healthTrend = trendPredictions
    .slice()
    .reverse()
    .map(prediction => Number(prediction.healthScore));
  const failureTrend = trendPredictions
    .slice()
    .reverse()
    .map(prediction => Number(prediction.failureProbability) * 100);
  const healthPoints = buildLinePoints(healthTrend);
  const failurePoints = buildLinePoints(failureTrend);
  const kpis = [
    {
      accent: "bg-[#2f9da7]",
      detail: pendingJobCount ? "Jobs pending" : "Queue clear",
      icon: Brain,
      label: "Inference",
      progress: totalReadingCount ? 100 : 0,
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: totalReadingCount,
    },
    {
      accent: "bg-[#5ec3cf]",
      detail: "Queue coverage",
      icon: Cpu,
      label: "Readiness",
      progress: readiness,
      tone: "bg-[#eefbfc] text-[#146c74]",
      value: `${readiness}%`,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: summaryPredictions.length ? "Average health" : "No predictions",
      icon: Pulse,
      label: "Health",
      progress: summaryPredictions.length ? averageHealth : 0,
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      value: summaryPredictions.length
        ? `${Math.round(averageHealth)}%`
        : "N/A",
    },
    {
      accent: "bg-[#ef4444]",
      detail: riskTotals.high ? "High risk" : "Risk average",
      icon: ShieldWarning,
      label: "Risk",
      progress: summaryPredictions.length ? averageFailure : 0,
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      value: summaryPredictions.length
        ? `${Math.round(averageFailure)}%`
        : "N/A",
    },
  ];

  return (
    <PremiumMotion profile="overview">
      <div className="grid w-full max-w-full min-w-0 gap-4">
        <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0" data-motion="reveal">
            <p className="text-sm font-medium text-[#2f9da7]">
              Predictive Analytics
            </p>
            <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
              AI Inference
            </h1>
          </div>
        </section>

        <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(kpi => (
            <MetricCard
              accent={kpi.accent}
              detail={kpi.detail}
              icon={kpi.icon}
              key={kpi.label}
              label={kpi.label}
              progress={kpi.progress}
              tone={kpi.tone}
              value={kpi.value}
            />
          ))}
        </section>

        <section className="w-full max-w-full min-w-0">
          <Card
            className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="min-w-0">
                <CardTitle>Inference Queue</CardTitle>
                <p className="text-sm text-zinc-500">
                  Operational readings ready for model execution
                </p>
              </div>
              <Badge
                className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {readingCount} readings
              </Badge>
            </CardHeader>
            <form className="grid gap-3 border-y border-zinc-100 px-4 py-3 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,0.55fr)_minmax(10rem,0.55fr)_auto] md:items-end">
              <div className="relative min-w-0">
                <MagnifyingGlass
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                />
                <Input
                  aria-label="Search inference queue"
                  className="h-10 rounded-full border-zinc-200 bg-zinc-50 pl-9"
                  defaultValue={query}
                  key={query}
                  name="q"
                  placeholder="Search equipment or source"
                />
              </div>
              <select
                aria-label="Filter by job status"
                className="h-10 min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
                defaultValue={job ?? ""}
                name="job"
              >
                {jobFilters.map(option => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by latest prediction"
                className="h-10 min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
                defaultValue={latest ?? ""}
                name="latest"
              >
                {latestFilters.map(option => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                <button
                  className={buttonVariants({
                    size: "sm",
                    className:
                      "h-10 rounded-full border-[#009966] !bg-[#009966] px-4 !text-white hover:!bg-[#007a55] hover:!text-white",
                  })}
                  type="submit"
                >
                  Apply
                </button>
                <Link
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className:
                      "h-10 rounded-full border-zinc-200 bg-white px-4 text-zinc-700 hover:bg-zinc-950 hover:text-white",
                  })}
                  href="/analytics"
                >
                  Reset
                </Link>
              </div>
            </form>
            <CardContent className="min-w-0 p-0">
              {readings.length ? (
                <>
                  <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
                    <Table className="min-w-[1040px]">
                      <TableHeader>
                        <TableRow className="border-zinc-200 bg-zinc-50">
                          <TableHead>Equipment</TableHead>
                          <TableHead>Recorded</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Signal</TableHead>
                          <TableHead>Latest</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead>Run</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {readings.map(reading => {
                          const latestPrediction = reading.predictions[0];

                          return (
                            <TableRow
                              className="border-zinc-100 transition-colors hover:bg-zinc-50"
                              key={reading.id}
                            >
                              <TableCell>
                                <div className="min-w-[13rem]">
                                  <p className="font-semibold text-zinc-950">
                                    {reading.equipment.assetTag}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {reading.equipment.name}
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {reading.equipment.location}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-zinc-950">
                                  {compactDateFormatter.format(
                                    reading.recordedAt,
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {timeFormatter.format(reading.recordedAt)}
                                </p>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className="rounded-full border-zinc-200 bg-white text-zinc-700"
                                  variant="outline"
                                >
                                  {formatSourceType(reading.sourceType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <SignalStack parameters={reading.parameters} />
                              </TableCell>
                              <TableCell>
                                {latestPrediction ? (
                                  <div className="inline-grid gap-1">
                                    <RiskBadge
                                      riskLevel={latestPrediction.riskLevel}
                                    />
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
                              <TableCell>
                                <PredictionJobBadge
                                  attempts={
                                    reading.predictionJob?.attempts ?? 0
                                  }
                                  status={
                                    latestPrediction
                                      ? "COMPLETED"
                                      : reading.predictionJob?.status
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <ActionToastForm
                                  action={runPredictionAction.bind(
                                    null,
                                    reading.id,
                                  )}
                                  errorTitle="Prediction was not queued"
                                  successDescription="The reading was added to the inference queue."
                                  successTitle="Prediction queued"
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
                                    Queue
                                  </button>
                                </ActionToastForm>
                              </TableCell>
                              <TableCell>
                                <Link
                                  className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                                  href={`/equipment/view-more/${reading.equipment.id}`}
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

        <section className="w-full max-w-full min-w-0">
          <Card
            className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="min-w-0">
                <CardTitle>Failure Trend</CardTitle>
                <p className="text-sm text-zinc-500">
                  Health score and failure risk
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <PredictionTrend
                failurePoints={failurePoints}
                hasData={trendPredictions.length > 0}
                healthPoints={healthPoints}
              />
            </CardContent>
          </Card>
        </section>

        <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-2">
          <Card
            className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-0">
              <div className="min-w-0">
                <CardTitle>Model Confidence</CardTitle>
                <p className="text-sm text-zinc-500">
                  Inverse failure probability
                </p>
              </div>
              <Gauge aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:py-2">
                <div
                  className="grid size-24 lg:size-20 shrink-0 place-items-center justify-self-center rounded-full sm:justify-self-start"
                  style={{
                    background: `conic-gradient(#2f9da7 ${modelConfidence}%, #dff7f3 0)`,
                  }}
                >
                  <div className="grid size-16 place-items-center rounded-full bg-white shadow-sm">
                    <span className="text-xl font-semibold text-zinc-950">
                      {modelConfidence}%
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <Badge
                    className="mx-auto w-fit rounded-full border-emerald-200 bg-white text-emerald-700 sm:mx-0"
                    variant="outline"
                  >
                    {predictionCount} runs
                  </Badge>
                  <p className="mt-2 text-xs leading-5 text-emerald-900/70 sm:text-sm">
                    Confidence is calibrated as 100 minus the latest average
                    failure probability across stored model outputs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-0">
              <div className="min-w-0">
                <CardTitle>Risk Mix</CardTitle>
                <p className="text-sm text-zinc-500">Stored predictions</p>
              </div>
              <ChartLineUp
                aria-hidden="true"
                className="size-5 text-zinc-500"
              />
            </CardHeader>
            <CardContent className="grid gap-3 p-3 pt-0 sm:grid-cols-3">
              {riskRows.map(row => (
                <DistributionCard
                  accent={row.accent}
                  key={row.key}
                  label={row.label}
                  tone={row.tone}
                  total={predictionCount}
                  value={riskTotals[row.key]}
                />
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="w-full max-w-full min-w-0">
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
                className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {storedPredictionCount} latest
              </Badge>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
              {predictions.length ? (
                <>
                  <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {predictions.map(prediction => (
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
                            {(
                              Number(prediction.failureProbability) * 100
                            ).toFixed(1)}
                            %
                          </span>
                          <span>
                            Health {prediction.healthScore.toString()}%
                          </span>
                          <span>
                            {formatEquipmentCategory(prediction.riskLevel)}
                          </span>
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
                  </div>
                  <PaginationControls
                    page={currentPredictionPage}
                    pageParam="predictionPage"
                    pageSize={storedPredictionPageSize}
                    searchParams={params}
                    total={storedPredictionCount}
                  />
                </>
              ) : (
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
  accent,
  detail,
  icon: Icon,
  label,
  progress,
  tone,
  value,
}: {
  accent: string;
  detail: string;
  icon: MetricIcon;
  label: string;
  progress: number;
  tone: string;
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
          <div
            className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}
          >
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-auto pt-3 text-sm font-medium text-zinc-500">
          {detail}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
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
    <div className="grid min-w-[10rem] max-w-[12rem] gap-2">
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

function DistributionCard({
  accent,
  label,
  tone,
  total,
  value,
}: {
  accent: string;
  label: string;
  tone: string;
  total: number;
  value: number;
}) {
  const width = percentage(value, total);

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-lg font-semibold text-zinc-950">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full ${accent}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-medium opacity-75">
        {width}% of stored runs
      </p>
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const className =
    riskLevel === "LOW"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : riskLevel === "MEDIUM"
        ? "border-amber-200 bg-amber-50 text-amber-700"
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

function PredictionTrend({
  failurePoints,
  hasData,
  healthPoints,
}: {
  failurePoints: ReturnType<typeof buildLinePoints>;
  hasData: boolean;
  healthPoints: ReturnType<typeof buildLinePoints>;
}) {
  return (
    <div className="rounded-[1.1rem] border border-zinc-200 bg-white p-3 shadow-inner sm:p-4">
      <div className="mb-4 grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-zinc-500 sm:text-xs">
            Predictive trend - percent over time
          </p>
          <p className="text-xl font-semibold tracking-normal text-zinc-950 sm:text-2xl">
            Health trajectory
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 sm:gap-4">
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
          aria-label="Prediction health and failure risk trend"
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
            d={failurePoints.path}
            fill="none"
            stroke="#18181b"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            style={{ opacity: hasData ? 1 : 0 }}
          />
          <g>
            {hasData &&
              healthPoints.coordinates.map(point => (
                <circle
                  className="hidden sm:block aegis-chart-dot"
                  cx={point.x}
                  cy={point.y}
                  fill="#a8ff9f"
                  key={point.x + "-" + point.y}
                  r="4"
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
          <span className="hidden sm:inline">Oldest prediction</span>
        </span>
        <span>
          <span className="sm:hidden">Latest</span>
          <span className="hidden sm:inline">Latest prediction</span>
        </span>
      </div>
    </div>
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
    <div className="m-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-4 text-zinc-400" />}
        <span>{label}</span>
      </div>
    </div>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseJobFilter(
  value: string | string[] | undefined,
): AnalyticsJobFilter | undefined {
  const job = getParam(value);

  if (!job) {
    return undefined;
  }

  return jobFilters.some(option => option.value === job)
    ? (job as AnalyticsJobFilter)
    : undefined;
}

function parseLatestFilter(
  value: string | string[] | undefined,
): AnalyticsLatestFilter | undefined {
  const latest = getParam(value);

  if (!latest) {
    return undefined;
  }

  return latestFilters.some(option => option.value === latest)
    ? (latest as AnalyticsLatestFilter)
    : undefined;
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
  const left = 18;
  const width = 604;
  const height = 216;
  const top = 12;
  const fallback = values.length ? values : [0];
  const max = Math.max(100, ...fallback);
  const coordinates = fallback.map((value, index) => {
    const x =
      fallback.length === 1
        ? left + width / 2
        : left + (index / (fallback.length - 1)) * width;
    const y = top + height - (Math.min(value, max) / max) * height;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  });
  const path = buildSmoothPath(coordinates);
  const area = coordinates.length
    ? path +
      " L " +
      (left + width) +
      "," +
      (height + top) +
      " L " +
      left +
      "," +
      (height + top) +
      " Z"
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
