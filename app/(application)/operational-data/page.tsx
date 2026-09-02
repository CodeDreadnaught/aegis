import type { Metadata } from "next";
import Link from "next/link";
import { Database, Factory, Gauge, Pulse } from "@phosphor-icons/react/ssr";

import { PaginationControls } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createOperationalReadingAction } from "@/features/operational-readings/actions";
import { CaptureWorkspace } from "@/features/operational-readings/capture-workspace";
import { getOperationalDataWorkspace } from "@/features/operational-readings/queries";
import { formatSourceType } from "@/features/operational-readings/validation";
import { parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Operational Data",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const metricCards = [
  {
    accent: "bg-[#2f9da7]",
    icon: Factory,
    key: "assets",
    label: "Assets",
    tone: "bg-[#e8fbf6] text-[#146c74]",
  },
  {
    accent: "bg-[#5ec3cf]",
    icon: Database,
    key: "readings",
    label: "Records",
    tone: "bg-[#eefbfc] text-[#146c74]",
  },
  {
    accent: "bg-[#f2bd3f]",
    icon: Pulse,
    key: "vibration",
    label: "Vibration",
    tone: "bg-[#fff6dc] text-[#8a5a00]",
  },
  {
    accent: "bg-[#ef7b63]",
    icon: Gauge,
    key: "pressure",
    label: "Pressure",
    tone: "bg-[#fff0ed] text-[#b13d2e]",
  },
] as const;

type OperationalDataPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function OperationalDataPage({
  searchParams,
}: OperationalDataPageProps) {
  await requirePermission("recordOperationalData");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const { equipment, metricReadings, readingCount, readings } =
    await getOperationalDataWorkspace(page);
  const averageVibration = average(
    metricReadings.map(
      reading => asReadingParameters(reading.parameters).vibrationMmS,
    ),
  );
  const averagePressure = average(
    metricReadings.map(reading =>
      asReadingParameters(reading.parameters).pressureBar,
    ),
  );
  const maxVibration = Math.max(
    1,
    ...metricReadings.map(
      reading => asReadingParameters(reading.parameters).vibrationMmS ?? 0,
    ),
  );
  const metricValues = {
    assets: {
      detail: "Active assets",
      progress: equipment.length ? 100 : 0,
      value: equipment.length,
    },
    readings: {
      detail: "Stored records",
      progress: readingCount ? 100 : 0,
      value: readingCount,
    },
    vibration: {
      detail: "Recent average",
      progress: percentage(averageVibration, maxVibration),
      value: averageVibration ? averageVibration.toFixed(2) : "N/A",
    },
    pressure: {
      detail: "Recent average",
      progress: percentage(averagePressure, 250),
      value: averagePressure ? Math.round(averagePressure) : "N/A",
    },
  };

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">
            Operational telemetry
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Data Capture
          </h1>
        </div>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => {
          const metric = metricValues[card.key];

          return (
            <MetricCard
              accent={card.accent}
              detail={metric.detail}
              icon={card.icon}
              key={card.key}
              label={card.label}
              progress={metric.progress}
              tone={card.tone}
              value={metric.value}
            />
          );
        })}
      </section>

      <section className="w-full max-w-full min-w-0">
        <Card
          className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle>Recent Readings</CardTitle>
              <p className="text-sm text-zinc-500">Model inputs</p>
            </div>
            <Badge
              className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {readingCount} records
            </Badge>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {readings.length ? (
              <>
                <div className="max-w-full min-w-0 px-4 pb-4">
                  <Table className="min-w-[1040px]">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead>Equipment</TableHead>
                        <TableHead>Model Inputs</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Signals</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Recorded</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map(reading => {
                        const parameters = asReadingParameters(
                          reading.parameters,
                        );

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
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge
                                  className="rounded-full border-zinc-200 bg-white text-zinc-700"
                                  variant="outline"
                                >
                                  Type {parameters.type ?? "M"}
                                </Badge>
                                <Badge
                                  className="rounded-full border-zinc-200 bg-white text-zinc-700"
                                  variant="outline"
                                >
                                  {formatNumber(parameters.torqueNm)} Nm
                                </Badge>
                                <Badge
                                  className="rounded-full border-zinc-200 bg-white text-zinc-700"
                                  variant="outline"
                                >
                                  {formatNumber(parameters.toolWearMinutes)} min
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-600">
                              <div className="inline-grid min-w-24 gap-1 text-left">
                                <p className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-zinc-500">Air</span>
                                  <span className="font-semibold text-zinc-950">
                                    {formatNumber(
                                      parameters.airTemperatureKelvin,
                                    )}
                                  </span>
                                </p>
                                <p className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-zinc-500">Process</span>
                                  <span className="font-semibold text-zinc-950">
                                    {formatNumber(
                                      parameters.processTemperatureKelvin,
                                    )}
                                  </span>
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-600">
                              <div className="grid max-w-[12rem] gap-2">
                                <div className="flex items-center justify-between gap-3 text-xs">
                                  <span>Vibration</span>
                                  <span className="font-semibold text-zinc-950">
                                    {formatNumber(parameters.vibrationMmS)} mm/s
                                  </span>
                                </div>
                                <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                  <span
                                    className="block h-full rounded-full bg-[#2f9da7]"
                                    style={{
                                      width: `${percentage(
                                        parameters.vibrationMmS ?? 0,
                                        maxVibration,
                                      )}%`,
                                    }}
                                  />
                                </span>
                                <p className="text-xs text-zinc-400">
                                  {formatNumber(parameters.pressureBar)} bar /{" "}
                                  {formatNumber(parameters.flowRateBpd)} bpd
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-600">
                              {formatSourceType(reading.sourceType)}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-zinc-950">
                                {compactDateFormatter.format(
                                  reading.recordedAt,
                                )}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {reading.createdBy?.name ?? "System"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Link
                                className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                                href={`/equipment/view-more/${reading.equipmentId}`}
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
              <div className="px-6 py-14 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-950">
                  <Database className="size-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-zinc-950">
                  No readings recorded
                </h2>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="w-full max-w-full min-w-0">
        <CaptureWorkspace
          action={createOperationalReadingAction}
          equipment={equipment}
        />
      </section>
    </div>
  );
}

type ReadingParameters = {
  airTemperatureKelvin?: number;
  flowRateBpd?: number;
  pressureBar?: number;
  processTemperatureKelvin?: number;
  toolWearMinutes?: number;
  torqueNm?: number;
  type?: string;
  vibrationMmS?: number;
};

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
  icon: typeof Factory;
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
            <p className="mt-0.5 break-words text-xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className={`grid size-7 shrink-0 place-items-center rounded-full ${tone}`}>
            <Icon aria-hidden="true" className="size-3.5" />
          </div>
        </div>
        <p className="mt-auto pt-2.5 text-sm font-medium text-zinc-500">
          {detail}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function asReadingParameters(value: unknown): ReadingParameters {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ReadingParameters;
}

function average(values: Array<number | undefined>) {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (!validValues.length) {
    return 0;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "N/A";
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
