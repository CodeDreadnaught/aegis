import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChartBar,
  Factory,
  HardHat,
  MagnifyingGlass,
  MapPin,
  Plus,
  Pulse,
  WarningCircle,
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
  const highRiskCount = equipment.filter(
    (item) => item.predictions[0]?.riskLevel === "HIGH"
  ).length;
  const readingCoverage = percentage(
    equipment.filter((item) => item._count.operationalReadings > 0).length,
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
              "h-11 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800",
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

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            detail={`${activeCount} active / ${readingCoverage}% with readings`}
            icon={Factory}
            label="Assets"
            tone="bg-zinc-950 text-white"
            value={equipment.length}
          />
          <MetricCard
            detail={`${overdueMaintenanceCount} overdue`}
            icon={Wrench}
            label="Maintenance"
            tone="bg-white text-zinc-950"
            value={maintenanceCount}
          />
          <MetricCard
            detail="Latest prediction average"
            icon={Pulse}
            label="Health"
            tone="bg-emerald-50 text-emerald-900"
            value={equipment.length ? `${Math.round(averageHealth)}%` : "N/A"}
          />
          <MetricCard
            detail={`${predictionCoverage}% AI coverage`}
            icon={WarningCircle}
            label="Risk"
            tone="bg-red-50 text-red-900"
            value={highRiskCount}
          />
        </div>

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
          className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-2">
            <CardTitle>Risk Queue</CardTitle>
            <p className="text-sm text-zinc-400">Highest failure probability</p>
          </CardHeader>
          <CardContent className="gap-2 p-4 pt-0">
            {criticalAssets.map((item) => (
              <Link
                className="group rounded-lg border border-white/10 bg-white/8 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/12"
                href={`/equipment/${item.id}`}
                key={item.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {item.location}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-300">
                    {Math.round(
                      Number(item.predictions[0]?.failureProbability ?? 0) * 100
                    )}
                    %
                  </span>
                </div>
              </Link>
            ))}
            {!criticalAssets.length && <EmptyState dark label="No predictions" />}
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
              Health, risk, readings and maintenance
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
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50/70">
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Readings</TableHead>
                    <TableHead>Maintenance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                        className="border-zinc-100 transition-colors hover:bg-zinc-50"
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
                        <TableCell className="text-zinc-600">
                          {formatEquipmentCategory(item.category)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                        <TableCell>
                          {prediction ? (
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                                <span
                                  className="block h-full rounded-full bg-zinc-950"
                                  style={{ width: `${health}%` }}
                                />
                              </span>
                              <span className="text-sm font-medium">
                                {health}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {prediction ? (
                            <div className="grid gap-1">
                              <RiskBadge risk={prediction.riskLevel} />
                              <span className="text-xs text-zinc-500">
                                {failure}% failure
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {item._count.operationalReadings}
                          {item.operationalReadings[0] && (
                            <p className="text-xs text-zinc-400">
                              {compactDateFormatter.format(
                                item.operationalReadings[0].recordedAt
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {item._count.maintenanceRecords}
                          {item.maintenanceRecords[0] && (
                            <p className="text-xs text-zinc-400">
                              {formatEquipmentCategory(
                                item.maintenanceRecords[0].status
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                              className:
                                "rounded-full text-zinc-600 hover:bg-zinc-950 hover:text-white",
                            })}
                            href={`/equipment/${item.id}`}
                          >
                            Details
                            <ArrowRight />
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
  tone,
  value,
}: {
  detail: string;
  icon: typeof Factory;
  label: string;
  tone: string;
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
          <div className={`grid size-9 place-items-center rounded-full ${tone}`}>
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
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

function EmptyState({ dark = false, label }: { dark?: boolean; label: string }) {
  return (
    <div
      className={
        dark
          ? "rounded-lg border border-dashed border-white/10 bg-white/8 p-4 text-sm text-zinc-400"
          : "rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500"
      }
    >
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
