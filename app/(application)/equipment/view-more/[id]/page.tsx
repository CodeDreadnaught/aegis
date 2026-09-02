import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChartLineUp,
  Gauge,
  MapPin,
  PencilSimple,
  Pulse,
  ShieldCheck,
  ShieldWarning,
  Trash,
  TrendUp,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { BackButton } from "@/components/back-button";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PaginationControls } from "@/components/table-pagination";
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
  deleteEquipmentAction,
  recommissionEquipmentAction,
} from "@/features/equipment/actions";
import { getEquipmentDetails } from "@/features/equipment/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { parsePageParam } from "@/lib/pagination";
import type { EquipmentStatus, RiskLevel } from "@/generated/prisma/enums";
import { can } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/session";

type EquipmentDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
};

const chartWidth = 680;
const chartHeight = 240;

export const metadata: Metadata = {
  title: "Equipment Profile",
};

export default async function EquipmentDetailsPage({
  params,
  searchParams,
}: EquipmentDetailsPageProps) {
  const user = await requirePermission("viewEquipment");
  const canUpdateEquipment = can(user.role, "updateEquipment");
  const canDeleteEquipment = can(user.role, "deleteEquipment");
  const { id } = await params;
  const queryParams = await searchParams;
  const readingPage = parsePageParam(queryParams?.page);
  const equipment = await getEquipmentDetails(id, readingPage);

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
  const deleteAction = deleteEquipmentAction.bind(null, equipment.id);
  const predictions = equipment.predictions.slice().reverse();
  const health = Math.round(asNumber(latestPrediction?.healthScore));
  const failure = Math.round(
    asNumber(latestPrediction?.failureProbability) * 100,
  );
  const healthTrend = predictions.map(prediction =>
    asNumber(prediction.healthScore),
  );
  const failureTrend = predictions.map(
    prediction => asNumber(prediction.failureProbability) * 100,
  );

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <BackButton className="mb-4" />
          <p className="text-sm font-medium text-[#2f9da7]">Equipment</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            {equipment.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={equipment.status} />
            {latestPrediction && (
              <RiskBadge risk={latestPrediction.riskLevel} />
            )}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span className="min-w-0 break-words">{equipment.assetTag}</span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
            <span className="min-w-0 break-words">{formatEquipmentCategory(equipment.category)}</span>
            <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:block" />
            <span className="inline-flex min-w-0 items-center gap-1 break-words">
              <MapPin aria-hidden="true" className="size-4" />
              {equipment.location}
            </span>
          </div>
        </div>
        {canUpdateEquipment || canDeleteEquipment ? (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row [&_form]:w-full sm:[&_form]:w-auto" data-motion="reveal">
            {canUpdateEquipment ? (
              <Link
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 w-full !rounded-[9999px] border-zinc-200 bg-white px-5 text-zinc-950 hover:border-zinc-950 hover:bg-zinc-950 hover:text-white sm:w-fit",
                })}
                href={`/equipment/view-more/${equipment.id}/edit`}
              >
                <PencilSimple />
                Edit
              </Link>
            ) : null}
            {(isDecommissioned ? canUpdateEquipment : canDeleteEquipment) ? (
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
                    variant: "outline",
                    className: isDecommissioned
                      ? "h-11 w-full !rounded-[9999px] border-[#009966]/25 bg-[#e8fbf6] px-5 text-[#007a55] hover:border-[#007a55] hover:bg-[#009966] hover:text-white sm:w-fit"
                      : "h-11 w-full !rounded-[9999px] border-[#f2bd3f]/45 bg-[#fff6dc] px-5 text-[#8a5a00] hover:border-[#d99010] hover:bg-[#fff1c2] hover:text-[#7a4c00] sm:w-fit",
                  })}
                  type="submit"
                >
                  {isDecommissioned ? <ShieldCheck /> : <ShieldWarning />}
                  {isDecommissioned ? "Recommission" : "Decommission"}
                </button>
              </ActionToastForm>
            ) : null}
            {canDeleteEquipment ? (
              <ConfirmActionForm
                action={deleteAction}
                confirmLabel="Delete equipment"
                description="This will permanently remove the equipment record and its linked readings, predictions, alerts, recommendations and maintenance records."
                errorTitle="Equipment was not deleted"
                title="Delete this equipment?"
              >
                <button
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-11 w-full !rounded-[9999px] !border-[#dc2626] !bg-[#dc2626] px-5 !text-white shadow-sm hover:!border-[#b91c1c] hover:!bg-[#b91c1c] hover:!text-white disabled:!opacity-100 sm:w-fit",
                  })}
                  type="submit"
                >
                  <Trash />
                  Delete
                </button>
              </ConfirmActionForm>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1.12fr)]">
        <div className="grid h-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <DetailMetricCard
            accent="bg-[#2f9da7]"
            detail={latestPrediction ? "Prediction health" : "No prediction"}
            icon={Gauge}
            label="AI Health"
            progress={latestPrediction ? health : 0}
            tone="bg-[#fff6dc] text-[#8a5a00]"
            value={latestPrediction ? `${health}%` : "Pending"}
          />
          <DetailMetricCard
            accent="bg-[#ef7b63]"
            detail={latestPrediction ? "Latest risk" : "No prediction"}
            icon={WarningCircle}
            label="Risk"
            progress={latestPrediction ? failure : 0}
            tone="bg-[#fff0ed] text-[#b13d2e]"
            value={latestPrediction ? `${failure}%` : "Pending"}
          />
          <DetailMetricCard
            accent="bg-[#5ec3cf]"
            detail="Sensor readings"
            icon={Pulse}
            label="Telemetry"
            progress={equipment._count.operationalReadings ? 100 : 0}
            tone="bg-[#e8fbf6] text-[#146c74]"
            value={equipment._count.operationalReadings}
          />
          <DetailMetricCard
            accent="bg-[#f2bd3f]"
            detail="Prediction runs"
            icon={ChartLineUp}
            label="AI Runs"
            progress={Math.min(equipment._count.predictions * 10, 100)}
            tone="bg-[#eefbfc] text-[#146c74]"
            value={equipment._count.predictions}
          />
        </div>

        <Card
          className="w-full max-w-full min-w-0 overflow-hidden rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="metric"
        >
          <CardContent className="grid gap-4 p-4">
            <div className="grid gap-3 rounded-xl border border-[#d8eeee] bg-[#f6fbfa] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">Live Signal</CardTitle>
                  <p className="mt-0.5 text-sm font-medium text-zinc-500">
                    Latest operating readings
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#146c74] shadow-sm">
                  <span className="size-2 rounded-full bg-[#009966] animate-pulse" />
                  Live
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SignalRow
                  accent="border-t-[#d99010]"
                  label="Pressure"
                  status="Normal"
                  unit="bar"
                  value={readParameter(latestReading?.parameters, "pressureBar")}
                />
                <SignalRow
                  accent="border-t-[#2f9da7]"
                  label="Flow"
                  status="Normal"
                  unit="bpd"
                  value={readParameter(latestReading?.parameters, "flowRateBpd")}
                />
              </div>
            </div>

            <div className="grid gap-3 border-t border-zinc-100 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">Asset Identity</CardTitle>
                  <p className="mt-0.5 text-sm font-medium text-zinc-500">
                    Registered equipment metadata
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                  {equipment.assetTag}
                </span>
              </div>
              <div className="grid max-w-full min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-3">
                <IdentityTile
                  label="Manufacturer"
                  value={equipment.manufacturer ?? "Not recorded"}
                />
                <IdentityTile
                  label="Model"
                  value={equipment.model ?? "Not recorded"}
                />
                <IdentityTile
                  label="Installed"
                  value={formatDate(equipment.installationDate)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="w-full max-w-full min-w-0">
        <Card
          className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-2">
            <CardTitle>Recent Readings</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {equipment.operationalReadings.length ? (
              <>
                <div className="max-w-full min-w-0 px-4 pb-4">
                  <Table className="min-w-[680px] sm:min-w-[720px]">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead>Recorded</TableHead>
                        <TableHead>Vibration</TableHead>
                        <TableHead>Pressure</TableHead>
                        <TableHead>Flow</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.operationalReadings.map(reading => (
                        <TableRow
                          className="border-zinc-100 hover:bg-zinc-50"
                          key={reading.id}
                        >
                          <TableCell className="font-medium text-zinc-950">
                            {formatDate(reading.recordedAt)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(
                              readParameter(reading.parameters, "vibrationMmS"),
                            )}{" "}
                            mm/s
                          </TableCell>
                          <TableCell>
                            {formatNumber(
                              readParameter(reading.parameters, "pressureBar"),
                            )}{" "}
                            bar
                          </TableCell>
                          <TableCell>
                            {formatNumber(
                              readParameter(reading.parameters, "flowRateBpd"),
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
                <PaginationControls
                  page={readingPage}
                  searchParams={queryParams}
                  total={equipment._count.operationalReadings}
                />
              </>
            ) : (
              <div className="px-4 pb-4">
                <EmptyState label="No readings available" />
              </div>
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

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card
          className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
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

        <Card
          className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-2">
            <CardTitle>Maintenance Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {equipment.maintenanceRecords.map(record => (
              <div
                className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
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
                    className="shrink-0 rounded-full border-zinc-200 bg-white text-zinc-700"
                    variant="outline"
                  >
                    {formatEquipmentCategory(record.status)}
                  </Badge>
                </div>
                <p className="mt-3 break-words text-sm text-zinc-600">
                  {record.description}
                </p>
              </div>
            ))}
            {!equipment.maintenanceRecords.length && (
              <EmptyState label="No maintenance records" />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DetailMetricCard({
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
  icon: typeof Pulse;
  label: string;
  progress: number;
  tone: string;
  value: number | string;
}) {
  return (
    <Card
      className="h-full w-full max-w-full min-w-0 rounded-[1.2rem] border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="flex min-h-32 flex-col px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className={`grid size-8 place-items-center rounded-full ${tone}`}>
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-auto pt-3 text-sm font-medium text-zinc-500">{detail}</p>
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

function SignalRow({
  accent,
  label,
  status,
  unit,
  value,
}: {
  accent: string;
  label: string;
  status: string;
  unit: string;
  value: number;
}) {
  const hasValue = Number.isFinite(value);

  return (
    <div className={`min-w-0 rounded-lg border border-t-2 border-zinc-200 bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50/60 hover:shadow-sm ${accent}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="truncate text-sm font-semibold text-zinc-950">{label}</p>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-normal text-zinc-500">
          {status}
        </span>
      </div>
      <div className="mt-3 flex min-w-0 items-baseline gap-1.5">
        <p className="max-w-full truncate text-2xl font-semibold leading-none tracking-normal text-zinc-950">
          {formatNumber(value)}
        </p>
        {hasValue ? (
          <p className="text-sm font-semibold lowercase leading-none tracking-normal text-zinc-500">
            {unit}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function IdentityTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-zinc-200 bg-white px-4 py-3 transition-colors duration-300 hover:bg-zinc-50/60 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-semibold text-zinc-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold leading-snug text-zinc-950">
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
    <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-zinc-500 ring-1 ring-zinc-200">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        <span className="truncate text-xs font-semibold text-zinc-500">
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
  const values = series.flatMap(item => item.values).filter(Number.isFinite);
  const chartMax = max ?? Math.max(1, ...values);

  if (!values.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <div className="h-64 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:h-72">
        <svg
          aria-hidden="true"
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {[0, 1, 2, 3].map(line => (
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
          {series.map(item => {
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
        {series.map(item => (
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

  const padding = 12;
  const drawableHeight = chartHeight - padding * 2;

  if (validValues.length === 1) {
    const y = padding + (1 - validValues[0] / max) * drawableHeight;
    return `M 0 ${y} L ${chartWidth} ${y}`;
  }

  return validValues
    .map((value, index) => {
      const x = (index / (validValues.length - 1)) * chartWidth;
      const y = padding + (1 - value / max) * drawableHeight;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
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
