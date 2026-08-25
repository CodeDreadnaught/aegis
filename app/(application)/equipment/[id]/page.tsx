import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChartLineUp,
  Gauge,
  MapPin,
  PencilSimple,
  Pulse,
  ShieldCheck,
  ShieldWarning,
  TrendUp,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
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
import {
  decommissionEquipmentAction,
  recommissionEquipmentAction,
} from "@/features/equipment/actions";
import { getEquipmentDetails } from "@/features/equipment/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import type { EquipmentStatus, RiskLevel } from "@/generated/prisma/enums";
import { requirePermission } from "@/server/auth/session";

type EquipmentDetailsPageProps = {
  params: Promise<{ id: string }>;
};

const chartWidth = 680;
const chartHeight = 240;

export const metadata: Metadata = {
  title: "AEGIS - Equipment Profile",
};

export default async function EquipmentDetailsPage({
  params,
}: EquipmentDetailsPageProps) {
  await requirePermission("viewEquipment");
  const { id } = await params;
  const equipment = await getEquipmentDetails(id);

  if (!equipment) {
    notFound();
  }

  const latestPrediction = equipment.predictions[0];
  const latestReading = equipment.operationalReadings[0];
  const latestMaintenance = equipment.maintenanceRecords[0];
  const isDecommissioned = equipment.status === "DECOMMISSIONED";
  const statusAction = (
    isDecommissioned ? recommissionEquipmentAction : decommissionEquipmentAction
  ).bind(null, equipment.id);
  const readings = equipment.operationalReadings.slice().reverse();
  const predictions = equipment.predictions.slice().reverse();
  const health = Math.round(asNumber(latestPrediction?.healthScore));
  const failure = Math.round(asNumber(latestPrediction?.failureProbability) * 100);
  const vibration = readings.map((reading) =>
    readParameter(reading.parameters, "vibrationMmS")
  );
  const pressure = readings.map((reading) =>
    readParameter(reading.parameters, "pressureBar")
  );
  const flow = readings.map((reading) =>
    readParameter(reading.parameters, "flowRateBpd")
  );
  const healthTrend = predictions.map((prediction) =>
    asNumber(prediction.healthScore)
  );
  const failureTrend = predictions.map(
    (prediction) => asNumber(prediction.failureProbability) * 100
  );

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
            href="/equipment"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Equipment
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={equipment.status} />
            {latestPrediction && <RiskBadge risk={latestPrediction.riskLevel} />}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            {equipment.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span>{equipment.assetTag}</span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
            <span>{formatEquipmentCategory(equipment.category)}</span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-4" />
              {equipment.location}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row" data-motion="reveal">
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "h-11 rounded-full border-zinc-200 bg-white px-5",
            })}
            href={`/equipment/${equipment.id}/edit`}
          >
            <PencilSimple />
            Edit
          </Link>
          <ActionToastForm
            action={statusAction}
            errorTitle={
              isDecommissioned
                ? "Equipment was not recommissioned"
                : "Equipment was not decommissioned"
            }
            successDescription="The asset status has been updated."
            successTitle={
              isDecommissioned
                ? "Equipment recommissioned"
                : "Equipment decommissioned"
            }
          >
            <button
              className={buttonVariants({
                variant: isDecommissioned ? "outline" : "destructive",
                className: isDecommissioned
                  ? "h-11 w-full rounded-full border-zinc-200 bg-white px-5 text-zinc-950 hover:bg-zinc-950 hover:text-white sm:w-fit"
                  : "h-11 w-full rounded-full px-5 sm:w-fit",
              })}
              type="submit"
            >
              {isDecommissioned ? <ShieldCheck /> : <ShieldWarning />}
              {isDecommissioned ? "Recommission" : "Decommission"}
            </button>
          </ActionToastForm>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetricCard
          detail={latestPrediction ? latestPrediction.riskLevel : "No AI run yet"}
          icon={Pulse}
          label="AI Health"
          value={latestPrediction ? `${health}%` : "Pending"}
        />
        <DetailMetricCard
          detail={latestPrediction ? "Failure probability" : "Run analytics"}
          icon={WarningCircle}
          label="Risk"
          value={latestPrediction ? `${failure}%` : "Pending"}
        />
        <DetailMetricCard
          detail="Operational readings"
          icon={ChartLineUp}
          label="Telemetry"
          value={equipment._count.operationalReadings}
        />
        <DetailMetricCard
          detail="Prediction runs"
          icon={TrendUp}
          label="AI Runs"
          value={equipment._count.predictions}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm xl:col-span-2"
          data-motion="metric"
        >
          <CardHeader className="pb-1">
            <CardTitle>Asset Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5 md:grid-cols-3">
            <IdentityTile
              icon={Gauge}
              label="Manufacturer"
              value={equipment.manufacturer ?? "Not recorded"}
            />
            <IdentityTile
              icon={Pulse}
              label="Model"
              value={equipment.model ?? "Not recorded"}
            />
            <IdentityTile
              icon={MapPin}
              label="Installed"
              value={formatDate(equipment.installationDate)}
            />
          </CardContent>
        </Card>

        <Card
          className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="metric"
        >
          <CardHeader className="pb-1">
            <CardTitle>Live Signal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <SignalRow
              label="Vibration"
              unit="mm/s"
              value={readParameter(latestReading?.parameters, "vibrationMmS")}
            />
            <SignalRow
              label="Pressure"
              unit="bar"
              value={readParameter(latestReading?.parameters, "pressureBar")}
            />
            <SignalRow
              label="Flow"
              unit="bpd"
              value={readParameter(latestReading?.parameters, "flowRateBpd")}
            />
          </CardContent>
        </Card>

        <Card
          className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="metric"
        >
          <CardHeader className="pb-1">
            <CardTitle>Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <InfoLine
              icon={Wrench}
              label="Latest"
              value={latestMaintenance?.type ?? "No record"}
            />
            <InfoLine
              icon={WarningCircle}
              label="Status"
              value={
                latestMaintenance
                  ? formatEquipmentCategory(latestMaintenance.status)
                  : "Pending"
              }
            />
            <InfoLine
              icon={Gauge}
              label="Next due"
              value={formatDate(latestMaintenance?.nextDueDate)}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Telemetry Trend</CardTitle>
              <p className="text-sm text-zinc-500">
                Vibration, pressure and flow
              </p>
            </div>
            <ChartLineUp aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <MultiLineChart
              emptyLabel="No readings available"
              series={[
                { color: "#18181b", label: "Vibration", values: vibration },
                { color: "#10b981", label: "Pressure", values: pressure },
                { color: "#94a3b8", label: "Flow", values: flow },
              ]}
            />
          </CardContent>
        </Card>

        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Prediction Curve</CardTitle>
              <p className="text-sm text-zinc-500">
                Health and failure probability
              </p>
            </div>
            <TrendUp aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <MultiLineChart
              emptyLabel="No predictions available"
              max={100}
              series={[
                { color: "#18181b", label: "Health", values: healthTrend },
                { color: "#ef4444", label: "Failure", values: failureTrend },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-2">
            <CardTitle>Maintenance Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {equipment.maintenanceRecords.map((record) => (
              <div
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                key={record.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-950">{record.type}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDate(record.performedAt)}
                    </p>
                  </div>
                  <Badge
                    className="rounded-full border-zinc-200 bg-white text-zinc-700"
                    variant="outline"
                  >
                    {formatEquipmentCategory(record.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-zinc-600">
                  {record.description}
                </p>
              </div>
            ))}
            {!equipment.maintenanceRecords.length && (
              <EmptyState label="No maintenance records" />
            )}
          </CardContent>
        </Card>

        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-2">
            <CardTitle>Recent Readings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {equipment.operationalReadings.length ? (
              <div className="overflow-x-auto px-4 pb-4">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50">
                      <TableHead className="text-center">Recorded</TableHead>
                      <TableHead className="text-center">Vibration</TableHead>
                      <TableHead className="text-center">Pressure</TableHead>
                      <TableHead className="text-center">Flow</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.operationalReadings.map((reading) => (
                      <TableRow
                        className="border-zinc-100 hover:bg-zinc-50"
                        key={reading.id}
                      >
                        <TableCell className="text-center font-medium text-zinc-950">
                          {formatDate(reading.recordedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatNumber(
                            readParameter(reading.parameters, "vibrationMmS")
                          )}{" "}
                          mm/s
                        </TableCell>
                        <TableCell className="text-center">
                          {formatNumber(
                            readParameter(reading.parameters, "pressureBar")
                          )}{" "}
                          bar
                        </TableCell>
                        <TableCell className="text-center">
                          {formatNumber(
                            readParameter(reading.parameters, "flowRateBpd")
                          )}{" "}
                          bpd
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {reading.sourceType}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <EmptyState label="No readings available" />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DetailMetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Pulse;
  label: string;
  value: number | string;
}) {
  return (
    <Card
      className="rounded-lg border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
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

function SignalRow({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  const hasValue = Number.isFinite(value);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(24,24,27,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_44px_rgba(24,24,27,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{label}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            Live telemetry
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
          <Pulse aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold leading-none text-zinc-950">
          {formatNumber(value)}
          {hasValue ? (
            <span className="ml-2 align-baseline text-sm font-semibold text-zinc-500">
              {unit}
            </span>
          ) : null}
        </p>
        <span className="flex h-8 items-end gap-1" aria-hidden="true">
          {[36, 68, 48, 82, 56].map((height, index) => (
            <span
              className="w-1 rounded-full bg-zinc-950/70"
              key={height}
              style={{
                height: `${hasValue ? height : 18 + index * 3}%`,
                opacity: hasValue ? 0.35 + index * 0.11 : 0.16,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function IdentityTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(24,24,27,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_44px_rgba(24,24,27,0.08)]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold text-zinc-500">
          {label}
        </span>
      </div>
      <p className="mt-4 truncate text-lg font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(24,24,27,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_44px_rgba(24,24,27,0.08)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold text-zinc-500">
          {label}
        </span>
      </div>
      <span className="min-w-fit max-w-[14rem] truncate text-sm font-semibold text-zinc-950">
        {value}
      </span>
    </div>
  );
}

function MultiLineChart({
  emptyLabel,
  max,
  series,
}: {
  emptyLabel: string;
  max?: number;
  series: Array<{ color: string; label: string; values: number[] }>;
}) {
  const values = series.flatMap((item) => item.values).filter(Number.isFinite);
  const chartMax = max ?? Math.max(1, ...values);

  if (!values.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="grid gap-4">
      <div className="aspect-[16/7] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <svg
          aria-hidden="true"
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              stroke="#e4e4e7"
              strokeDasharray="5 7"
              strokeWidth="1"
              x1="0"
              x2={chartWidth}
              y1={(chartHeight / 3) * line}
              y2={(chartHeight / 3) * line}
            />
          ))}
          {series.map((item) => {
            const path = buildPath(item.values, chartMax);

            if (!path) {
              return null;
            }

            return (
              <path
                d={path}
                fill="none"
                key={item.label}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3">
        {series.map((item) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600"
            key={item.label}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const className =
    status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "MAINTENANCE"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {formatEquipmentCategory(status)}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const className =
    risk === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : risk === "MEDIUM"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
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

function buildPath(values: number[], max: number) {
  const validValues = values.filter(Number.isFinite);

  if (!validValues.length) {
    return "";
  }

  if (validValues.length === 1) {
    const y = chartHeight - (validValues[0] / max) * chartHeight;
    return `M 0 ${y} L ${chartWidth} ${y}`;
  }

  return validValues
    .map((value, index) => {
      const x = (index / (validValues.length - 1)) * chartWidth;
      const y = chartHeight - (value / max) * chartHeight;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function readParameter(parameters: unknown, key: string) {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return 0;
  }

  const value = (parameters as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: number) {
  return value
    ? new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)
    : "N/A";
}

function formatDate(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "Not scheduled";
}
