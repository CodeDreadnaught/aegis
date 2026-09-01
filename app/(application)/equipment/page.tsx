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
import { PaginationControls } from "@/components/table-pagination";
import { paginateItems, parsePageParam } from "@/lib/pagination";
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
import { deleteEquipmentBulkAction } from "@/features/equipment/actions";
import { EquipmentBulkDeleteForm } from "@/features/equipment/equipment-bulk-delete-form";
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
import { can } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Equipment",
};

type EquipmentPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
    page?: string | string[];
    status?: string | string[];
  }>;
};

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
});

const mixColors = ["#2f9da7", "#184f4f", "#f2bd3f", "#ef7b63"];

export default async function EquipmentPage({
  searchParams,
}: EquipmentPageProps) {
  const user = await requirePermission("viewEquipment");
  const canCreateEquipment = can(user.role, "createEquipment");
  const canDeleteEquipment = can(user.role, "deleteEquipment");
  const params = await searchParams;
  const query = getParam(params?.q);
  const page = parsePageParam(params?.page);
  const status = parseStatus(getParam(params?.status));
  const category = parseCategory(getParam(params?.category));
  const equipment = await getEquipmentList(query, { category, status });
  const paginatedEquipment = paginateItems(equipment, page);
  const now = new Date();
  const activeCount = equipment.filter(item => item.status === "ACTIVE").length;
  const maintenanceCount = equipment.filter(
    item => item.status === "MAINTENANCE",
  ).length;
  const overdueMaintenanceCount = equipment.filter(item => {
    const nextDueDate = item.maintenanceRecords[0]?.nextDueDate;

    return nextDueDate ? nextDueDate < now : false;
  }).length;
  const dueSoonCount = equipment.filter(item => {
    const nextDueDate = item.maintenanceRecords[0]?.nextDueDate;

    if (!nextDueDate || nextDueDate < now) {
      return false;
    }

    return nextDueDate.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length;
  const highRiskCount = equipment.filter(
    item => item.predictions[0]?.riskLevel === "HIGH",
  ).length;
  const monitoredCount = equipment.filter(
    item => item._count.operationalReadings > 0,
  ).length;
  const readingCoverage = percentage(monitoredCount, equipment.length);
  const predictionCoverage = percentage(
    equipment.filter(item => item.predictions[0]).length,
    equipment.length,
  );
  const averageHealth = average(
    equipment.map(item => Number(item.predictions[0]?.healthScore ?? 0)),
  );
  const statusCounts = equipmentStatuses.map(item => ({
    label: formatEquipmentCategory(item),
    value: equipment.filter(asset => asset.status === item).length,
  }));
  const categoryCounts = equipmentCategories
    .map(item => ({
      label: formatEquipmentCategory(item),
      value: equipment.filter(asset => asset.category === item).length,
    }))
    .filter(item => item.value > 0);
  const visibleCategoryCounts = categoryCounts.slice(0, 3);
  const hiddenCategoryCount = categoryCounts
    .slice(3)
    .reduce((sum, item) => sum + item.value, 0);
  const fleetMixRows = hiddenCategoryCount
    ? [...visibleCategoryCounts, { label: "Other", value: hiddenCategoryCount }]
    : visibleCategoryCounts;
  const criticalAssets = equipment
    .filter(item => item.predictions[0])
    .slice()
    .sort(
      (left, right) =>
        Number(right.predictions[0]?.failureProbability ?? 0) -
        Number(left.predictions[0]?.failureProbability ?? 0),
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Equipment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Asset Fleet
          </h1>
        </div>
        {canCreateEquipment ? (
          <div className="hidden lg:block" data-motion="reveal">
            <Link
              className={buttonVariants({
                className:
                  "h-11 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
              })}
              href="/equipment/new"
            >
              <Plus />
              Register
            </Link>
          </div>
        ) : null}
      </section>

      <Card
        className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardContent className="p-4">
          <form
            action="/equipment"
            className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_14rem_14rem_auto_auto]"
          >
            <label className="sr-only" htmlFor="q">
              Search equipment
            </label>
            <div className="relative">
              <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-12 rounded-full border-zinc-200 bg-zinc-50 pl-11 text-sm shadow-inner shadow-zinc-950/5"
                defaultValue={query}
                id="q"
                name="q"
                placeholder="Search tag, asset name or location"
              />
            </div>
            <select
              className="h-12 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
              defaultValue={status ?? ""}
              name="status"
            >
              <option value="">All statuses</option>
              {equipmentStatuses.map(item => (
                <option key={item} value={item}>
                  {formatEquipmentCategory(item)}
                </option>
              ))}
            </select>
            <select
              className="h-12 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
              defaultValue={category ?? ""}
              name="category"
            >
              <option value="">All categories</option>
              {equipmentCategories.map(item => (
                <option key={item} value={item}>
                  {formatEquipmentCategory(item)}
                </option>
              ))}
            </select>
            <button
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-12 rounded-full border-zinc-950 bg-zinc-950 px-6 text-white shadow-sm hover:bg-zinc-800",
              })}
              type="submit"
            >
              Apply
            </button>
            {canCreateEquipment ? (
              <div className="lg:hidden">
                <Link
                  className={buttonVariants({
                    className:
                      "h-11 w-full rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
                  })}
                  href="/equipment/new"
                >
                  <Plus />
                  Register
                </Link>
              </div>
            ) : null}
            {(query || status || category) && (
              <Link
                className={buttonVariants({
                  variant: "ghost",
                  className: "h-12 rounded-full px-5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950",
                })}
                href="/equipment"
              >
                Reset
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <section className="grid items-stretch gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="grid h-full gap-3 sm:grid-cols-2">
          <MetricCard
            accent="bg-[#f2bd3f]"
            detail={`${activeCount} active assets`}
            icon={Pulse}
            label="Readiness"
            progress={equipment.length ? Math.round(averageHealth) : 0}
            tone="bg-[#fff6dc] text-[#8a5a00]"
            value={equipment.length ? `${Math.round(averageHealth)}%` : "N/A"}
          />
          <MetricCard
            accent="bg-[#2f9da7]"
            detail={`${readingCoverage}% with readings`}
            icon={Factory}
            label="Monitored"
            progress={readingCoverage}
            tone="bg-[#e8fbf6] text-[#146c74]"
            value={monitoredCount}
          />
          <MetricCard
            accent="bg-[#5ec3cf]"
            detail={`${predictionCoverage}% AI coverage`}
            icon={ChartBar}
            label="Predicted"
            progress={predictionCoverage}
            tone="bg-[#eefbfc] text-[#146c74]"
            value={equipment.filter(item => item.predictions[0]).length}
          />
          <MetricCard
            accent="bg-[#ef7b63]"
            detail={`${overdueMaintenanceCount} overdue / ${dueSoonCount} due soon`}
            icon={Wrench}
            label="Maintenance"
            progress={percentage(maintenanceCount, equipment.length)}
            tone="bg-[#fff0ed] text-[#b13d2e]"
            value={maintenanceCount}
          />
        </div>

        <Card
          className="h-full rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Fleet Mix</CardTitle>
              <p className="text-sm text-zinc-500">Lifecycle and category spread</p>
            </div>
            <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              {statusCounts.map(item => (
                <StatusSummary
                  key={item.label}
                  label={item.label}
                  total={equipment.length}
                  value={item.value}
                />
              ))}
            </div>
            <div className="grid gap-3 rounded-[1rem] border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-zinc-500">
                <span>Category mix</span>
                <span>{equipment.length} assets</span>
              </div>
              {fleetMixRows.map((item, index) => (
                <DistributionRow
                  accent={mixColors[index % mixColors.length]}
                  key={item.label}
                  label={item.label}
                  total={equipment.length}
                  value={item.value}
                />
              ))}
              {!fleetMixRows.length && <EmptyState label="No assets" />}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card
        className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div>
            <CardTitle>Risk Queue</CardTitle>
            <p className="text-sm text-zinc-500">
              Highest failure probability
            </p>
          </div>
          <Badge
            className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
            variant="outline"
          >
            {highRiskCount} high risk
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-4">
          {criticalAssets.map(item => (
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
                    Number(item.predictions[0]?.failureProbability ?? 0) *
                      100,
                  )}
                  %
                </span>
              </div>
            </Link>
          ))}
          {!criticalAssets.length && <EmptyState label="No predictions" />}
        </CardContent>
      </Card>

      <Card
        className="rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
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
            <EquipmentBulkDeleteForm
              action={deleteEquipmentBulkAction}
              enabled={canDeleteEquipment}
            >
              <div className="overflow-x-auto px-4 pb-4">
                <Table className="min-w-[1020px]">
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50">
                      {canDeleteEquipment ? (
                        <TableHead className="w-12">Select</TableHead>
                      ) : null}
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-center">
                        Classification
                      </TableHead>
                      <TableHead className="text-center">Health</TableHead>
                      <TableHead className="text-center">Risk</TableHead>
                      <TableHead className="text-center">Telemetry</TableHead>
                      <TableHead className="text-center">Maintenance</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEquipment.items.map(item => {
                      const prediction = item.predictions[0];
                      const health = Number(prediction?.healthScore ?? 0);
                      const failure = Math.round(
                        Number(prediction?.failureProbability ?? 0) * 100,
                      );

                      return (
                        <TableRow
                          className="border-zinc-100 transition-all duration-300 hover:bg-zinc-50"
                          key={item.id}
                        >
                          {canDeleteEquipment ? (
                            <TableCell>
                              <input
                                aria-label={`Select ${item.assetTag}`}
                                className="size-4 rounded border-zinc-300 text-zinc-950"
                                name="equipmentId"
                                type="checkbox"
                                value={item.id}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell>
                            <div className="min-w-[14rem]">
                              <p className="font-semibold text-zinc-950">
                                {item.assetTag}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {item.name}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                                <MapPin
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
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
                              <span className="text-sm text-zinc-400">
                                Pending
                              </span>
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
                              <span className="text-sm text-zinc-400">
                                Pending
                              </span>
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
                                  item.operationalReadings[0].recordedAt,
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
                                  item.maintenanceRecords[0].status,
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
              <PaginationControls
                page={paginatedEquipment.currentPage}
                searchParams={params}
                total={paginatedEquipment.total}
              />
            </EquipmentBulkDeleteForm>
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
      className="h-full rounded-[1.2rem] border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(24,24,27,0.08)]"
      data-motion="metric"
    >
      <CardContent className="px-4 py-3">
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
        <p className="mt-3 text-xs font-medium text-zinc-500">{detail}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusSummary({
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
    <div className="rounded-[1rem] border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-950">{label}</span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-600 shadow-sm">
          {value}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-950"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function DistributionRow({
  accent,
  label,
  total,
  value,
}: {
  accent: string;
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
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: accent, width: `${width}%` }}
        />
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

function parseCategory(
  value: string | undefined,
): EquipmentCategory | undefined {
  return equipmentCategories.includes(value as EquipmentCategory)
    ? (value as EquipmentCategory)
    : undefined;
}

function average(values: number[]) {
  const validValues = values.filter(
    value => Number.isFinite(value) && value > 0,
  );

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
