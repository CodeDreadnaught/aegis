import type { Metadata } from "next";
import {
  Database,
  Factory,
  Gauge,
  Pulse,
} from "@phosphor-icons/react/ssr";

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
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Operational Data",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export default async function OperationalDataPage() {
  await requirePermission("recordOperationalData");
  const { equipment, readings } = await getOperationalDataWorkspace();
  const activeSources = new Set(readings.map((reading) => reading.sourceType)).size;
  const signalReadings = readings.map((reading) => ({
    assetTag: reading.equipment.assetTag,
    equipmentId: reading.equipmentId,
    name: reading.equipment.name,
    parameters: asReadingParameters(reading.parameters),
  }));
  const averageVibration = average(
    readings.map((reading) => asReadingParameters(reading.parameters).vibrationMmS)
  );
  const averagePressure = average(
    readings.map((reading) => asReadingParameters(reading.parameters).pressureBar)
  );
  const maxVibration = Math.max(
    1,
    ...readings.map(
      (reading) => asReadingParameters(reading.parameters).vibrationMmS ?? 0
    )
  );

  return (
    <div className="grid min-w-0 gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Operational telemetry</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Data Capture
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard
          detail="Available for capture"
          icon={Factory}
          label="Assets"
          value={equipment.length}
        />
        <MetricCard
          detail={`${activeSources} sources`}
          icon={Database}
          label="Readings"
          value={readings.length}
        />
        <MetricCard
          detail="mm/s average"
          icon={Pulse}
          label="Vibration"
          value={averageVibration ? averageVibration.toFixed(2) : "N/A"}
        />
        <MetricCard
          detail="bar average"
          icon={Gauge}
          label="Pressure"
          value={averagePressure ? Math.round(averagePressure) : "N/A"}
        />
      </section>

      <section className="min-w-0">
        <Card
          className="min-w-0 max-w-full rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Recent Readings</CardTitle>
              <p className="text-sm text-zinc-500">Model inputs and plant context</p>
            </div>
            <Badge
              className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {readings.length} records
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {readings.length ? (
              <div className="min-w-0 max-w-full px-4 pb-4">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50">
                      <TableHead>Equipment</TableHead>
                      <TableHead className="text-center">Model Inputs</TableHead>
                      <TableHead className="text-center">Temperature (K)</TableHead>
                      <TableHead className="text-center">Signals</TableHead>
                      <TableHead className="text-center">Source</TableHead>
                      <TableHead className="text-center">Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.map((reading) => {
                      const parameters = asReadingParameters(reading.parameters);

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
                          <TableCell className="text-center">
                            <div className="inline-flex flex-wrap justify-center gap-1.5">
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
                          <TableCell className="text-center text-zinc-600">
                            <div className="inline-grid min-w-24 gap-1 text-left">
                              <p className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-zinc-500">Air</span>
                                <span className="font-semibold text-zinc-950">
                                  {formatNumber(parameters.airTemperatureKelvin)}
                                </span>
                              </p>
                              <p className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-zinc-500">Process</span>
                                <span className="font-semibold text-zinc-950">
                                  {formatNumber(parameters.processTemperatureKelvin)}
                                </span>
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-zinc-600">
                            <div className="mx-auto grid max-w-[12rem] gap-2">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span>Vibration</span>
                                <span className="font-semibold text-zinc-950">
                                  {formatNumber(parameters.vibrationMmS)} mm/s
                                </span>
                              </div>
                              <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                <span
                                  className="block h-full rounded-full bg-zinc-950"
                                  style={{
                                    width: `${percentage(
                                      parameters.vibrationMmS ?? 0,
                                      maxVibration
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
                          <TableCell className="text-center text-zinc-600">
                            {formatSourceType(reading.sourceType)}
                          </TableCell>
                          <TableCell className="text-center">
                            <p className="font-medium text-zinc-950">
                              {compactDateFormatter.format(reading.recordedAt)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {reading.createdBy?.name ?? "System"}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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

      <CaptureWorkspace
        action={createOperationalReadingAction}
        equipment={equipment}
        signals={signalReadings}
      />
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
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Factory;
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

function asReadingParameters(value: unknown): ReadingParameters {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ReadingParameters;
}

function average(values: Array<number | undefined>) {
  const validValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
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
