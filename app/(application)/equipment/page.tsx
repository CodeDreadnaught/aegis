import type { Metadata } from "next";
import Link from "next/link";
import {
  ChartBar,
  Factory,
  HardHat,
  MagnifyingGlass,
  MapPin,
  Plus,
  Pulse,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEquipmentList } from "@/features/equipment/queries";
import {
  equipmentCategories,
  equipmentStatuses,
  formatEquipmentCategory,
} from "@/features/equipment/validation";
import type {
  EquipmentCategory,
  EquipmentStatus,
  RiskLevel,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Equipment",
};

type EquipmentPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
};

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
});

export default async function EquipmentPage({
  searchParams,
}: EquipmentPageProps) {
  await requirePermission("viewEquipment");
  const params = await searchParams;
  const query = getParam(params?.q);
  const status = parseStatus(getParam(params?.status));
  const category = parseCategory(getParam(params?.category));
  const equipment = await getEquipmentList(query, { category, status });
  const now = new Date();
  const activeCount = equipment.filter((item) => item.status === "ACTIVE").length;
  const maintenanceCount = equipment.filter(
    (item) => item.status === "MAINTENANCE"
  ).length;
  const overdueMaintenanceCount = equipment.filter((item) => {
    const nextDueDate = item.maintenanceRecords[0]?.nextDueDate;

    return nextDueDate ? nextDueDate < now : false;
  }).length;
  const dueSoonCount = equipment.filter((item) => {
    const nextDueDate = item.maintenanceRecords[0]?.nextDueDate;

    if (!nextDueDate || nextDueDate < now) {
      return false;
    }

    return (
      nextDueDate.getTime() - now.getTime() <=
      1000 * 60 * 60 * 24 * 30
    );
  }).length;
  const highRiskCount = equipment.filter(
    (item) => item.predictions[0]?.riskLevel === "HIGH"
  ).length;
  const monitoredCount = equipment.filter(
    (item) => item._count.operationalReadings > 0
  ).length;
  const readingCoverage = percentage(
    monitoredCount,
    equipment.length
  );
  const predictionCoverage = percentage(
    equipment.filter((item) => item.predictions[0]).length,
    equipment.length
  );
  const averageHealth = average(
    equipment.map((item) => Number(item.predictions[0]?.healthScore ?? 0))
  );
  const statusCounts = equipmentStatuses.map((item) => ({
    label: formatEquipmentCategory(item),
    value: equipment.filter((asset) => asset.status === item).length,
  }));
  const categoryCounts = equipmentCategories
    .map((item) => ({
      label: formatEquipmentCategory(item),
      value: equipment.filter((asset) => asset.category === item).length,
    }))
    .filter((item) => item.value > 0);
  const criticalAssets = equipment
    .filter((item) => item.predictions[0])
    .slice()
    .sort(
      (left, right) =>
        Number(right.predictions[0]?.failureProbability ?? 0) -
        Number(left.predictions[0]?.failureProbability ?? 0)
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Equipment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Asset Fleet
          </h1>
        </div>
        <Link
          className={buttonVariants({
            className:
              "hidden h-11 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800 lg:inline-flex",
          })}
          data-motion="reveal"
          href="/equipment/new"
        >
          <Plus />
          Register
        </Link>
      </section>

      <Card
        className="rounded-lg border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardContent className="p-3">
          <form
            action="/equipment"
            className="grid gap-2 lg:grid-cols-[1fr_13rem_13rem_auto_auto]"
          >
            <label className="sr-only" htmlFor="q">
              Search equipment
            </label>
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-11 rounded-full border-zinc-200 bg-zinc-50 pl-10"
                defaultValue={query}
                id="q"
                name="q"
                placeholder="Search tag, asset name or location"
              />
            </div>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              defaultValue={status ?? ""}
              name="status"
            >
              <option value="">All statuses</option>
              {equipmentStatuses.map((item) => (
                <option key={item} value={item}>
                  {formatEquipmentCategory(item)}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              defaultValue={category ?? ""}
              name="category"
            >
              <option value="">All categories</option>
              {equipmentCategories.map((item) => (
                <option key={item} value={item}>
                  {formatEquipmentCategory(item)}
                </option>
              ))}
            </select>
            <button
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-11 rounded-full border-zinc-200 bg-white px-5 text-zinc-950 hover:bg-zinc-950 hover:text-white",
              })}
              type="submit"
            >
              Apply
            </button>
            <Link
              className={buttonVariants({
                className:
                  "h-11 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800 lg:hidden",
              })}
              href="/equipment/new"
            >
              <Plus />
              Register
            </Link>
            {(query || status || category) && (
              <Link
                className={buttonVariants({
                  variant: "ghost",
                  className: "h-11 rounded-full px-5 text-zinc-500",
                })}
                href="/equipment"
              >
                Reset
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail={`${activeCount} active assets`}
          icon={Pulse}
          label="Readiness"
          value={equipment.length ? `${Math.round(averageHealth)}%` : "N/A"}
        />
        <MetricCard
          detail={`${readingCoverage}% with recent readings`}
          icon={Factory}
          label="Monitored"
          value={monitoredCount}
        />
        <MetricCard
          detail={`${predictionCoverage}% AI coverage`}
          icon={ChartBar}
          label="Predicted"
          value={equipment.filter((item) => item.predictions[0]).length}
        />
        <MetricCard
          detail={`${overdueMaintenanceCount} overdue / ${dueSoonCount} due soon`}
          icon={Wrench}
          label="Maintenance"
          value={maintenanceCount}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">

        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Fleet Mix</CardTitle>
              <p className="text-sm text-zinc-500">Equipment categories</p>
            </div>
            <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="gap-3 p-4 pt-0">
            <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              {statusCounts.map((item) => (
                <DistributionRow
                  key={item.label}
                  label={item.label}
                  total={equipment.length}
                  value={item.value}
                />
              ))}
            </div>
            {categoryCounts.map((item) => (
              <DistributionRow
                key={item.label}
                label={item.label}
                total={equipment.length}
                value={item.value}
              />
            ))}
            {!categoryCounts.length && <EmptyState label="No assets" />}
          </CardContent>
        </Card>

        <Card
          className="rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
            <CardTitle>Risk Queue</CardTitle>
              <p className="text-sm text-zinc-500">Highest failure probability</p>
            </div>
            <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700" variant="outline">
              {highRiskCount} high risk
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
            {criticalAssets.map((item) => (
              <Link
                className="group rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                href={`/equipment/${item.id}`}
                key={item.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {item.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {item.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-red-600">
                    {Math.round(
                      Number(item.predictions[0]?.failureProbability ?? 0) * 100
                    )}
                    %
                  </span>
                </div>
              </Link>
            ))}
            {!criticalAssets.length && <EmptyState label="No predictions" />}
          </CardContent>
        </Card>
      </section>

      <Card
        className="rounded-lg border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <div>
            <CardTitle>Equipment Register</CardTitle>
            <p className="text-sm text-zinc-500">
              Health, risk and maintenance exposure
            </p>
          </div>
          <Badge
            className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
            variant="outline"
          >
            {equipment.length} assets
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {equipment.length ? (
            <div className="overflow-x-auto px-4 pb-4">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50">
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-center">Classification</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                    <TableHead className="text-center">Telemetry</TableHead>
                    <TableHead className="text-center">Maintenance</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => {
                    const prediction = item.predictions[0];
                    const health = Number(prediction?.healthScore ?? 0);
                    const failure = Math.round(
                      Number(prediction?.failureProbability ?? 0) * 100
                    );

                    return (
                      <TableRow
                        className="border-zinc-100 transition-all duration-300 hover:bg-zinc-50"
                        key={item.id}
                      >
                        <TableCell>
                          <div className="min-w-[14rem]">
                            <p className="font-semibold text-zinc-950">
                              {item.assetTag}
                            </p>
                            <p className="text-xs text-zinc-500">{item.name}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                              <MapPin aria-hidden="true" className="size-3.5" />
                              <span>{item.location}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-grid justify-items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-950">
                              {formatEquipmentCategory(item.category)}
                            </span>
                            <StatusBadge status={item.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {prediction ? (
                            <div className="mx-auto grid min-w-[8rem] max-w-[9rem] gap-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-zinc-950">
                                  {health}%
                                </span>
                                <span className="text-xs text-zinc-400">
                                  Health
                                </span>
                              </div>
                              <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
                                <span
                                  className="block h-full rounded-full bg-zinc-950"
                                  style={{ width: `${health}%` }}
                                />
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {prediction ? (
                            <div className="inline-grid justify-items-center gap-1">
                              <RiskBadge risk={prediction.riskLevel} />
                              <span className="text-xs text-zinc-500">
                                {failure}% failure
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-zinc-600">
                          <span className="font-semibold text-zinc-950">
                            {item._count.operationalReadings}
                          </span>{" "}
                          readings
                          {item.operationalReadings[0] && (
                            <p className="text-xs text-zinc-400">
                              {compactDateFormatter.format(
                                item.operationalReadings[0].recordedAt
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-zinc-600">
                          <span className="font-semibold text-zinc-950">
                            {item._count.maintenanceRecords}
                          </span>{" "}
                          records
                          {item.maintenanceRecords[0] && (
                            <p className="text-xs text-zinc-400">
                              {formatEquipmentCategory(
                                item.maintenanceRecords[0].status
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link
                            className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                            href={`/equipment/${item.id}`}
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
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-950">
                <HardHat className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-950">
                No equipment found
              </h2>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
      className="rounded-lg border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              {value}
            </p>
          </div>
          <div className="grid size-9 place-items-center rounded-full bg-zinc-950 text-white">
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-zinc-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DistributionRow({
  label,
  total,
  value,
}: {
  label: string;
  total: number;
  value: number;
}) {
  const width = percentage(value, total);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-950">{label}</span>
        <span className="text-xs font-semibold text-zinc-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-950" style={{ width: `${width}%` }} />
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
      className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-center text-xs font-semibold ${className}`}
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

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): EquipmentStatus | undefined {
  return equipmentStatuses.includes(value as EquipmentStatus)
    ? (value as EquipmentStatus)
    : undefined;
}

function parseCategory(value: string | undefined): EquipmentCategory | undefined {
  return equipmentCategories.includes(value as EquipmentCategory)
    ? (value as EquipmentCategory)
    : undefined;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);

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
