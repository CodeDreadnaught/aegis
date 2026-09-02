import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  ChartBar,
  ClockCounterClockwise,
  Factory,
  ShieldWarning,
  Wrench,
} from "@phosphor-icons/react/ssr";

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
import { createMaintenanceRecordAction } from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/maintenance-form";
import { getMaintenanceWorkspace } from "@/features/maintenance/queries";
import {
  formatMaintenanceStatus,
  isOverdue,
} from "@/features/maintenance/validation";
import { parsePageParam } from "@/lib/pagination";
import { can } from "@/server/auth/permissions";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Maintenance",
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
    icon: CalendarCheck,
    key: "completed",
    label: "Completed",
    tone: "bg-[#eefbfc] text-[#146c74]",
  },
  {
    accent: "bg-[#f2bd3f]",
    icon: ClockCounterClockwise,
    key: "open",
    label: "Open Work",
    tone: "bg-[#fff6dc] text-[#8a5a00]",
  },
  {
    accent: "bg-[#ef7b63]",
    icon: ShieldWarning,
    key: "risk",
    label: "Schedule Risk",
    tone: "bg-[#fff0ed] text-[#b13d2e]",
  },
] as const;

const statusAccents = ["#2f9da7", "#5ec3cf", "#f2bd3f", "#ef7b63"];

type MaintenancePageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function MaintenancePage({
  searchParams,
}: MaintenancePageProps) {
  const user = await requirePermission("viewMaintenance");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const canRecordMaintenance = can(user.role, "recordMaintenance");
  const { equipment, records, scheduleRecords, totals } =
    await getMaintenanceWorkspace(page);
  const now = new Date();
  const activeAssetCount = equipment.length;
  const overdueCount = scheduleRecords.filter(record =>
    isOverdue(record.nextDueDate, now),
  ).length;
  const dueSoonCount = scheduleRecords.filter(record =>
    isDueSoon(record.nextDueDate, now),
  ).length;
  const completionRate = percentage(totals.completed, totals.total);
  const openWorkCount = totals.planned + totals.in_progress + totals.deferred;
  const scheduleRiskCount = overdueCount + dueSoonCount;
  const upcomingRecords = scheduleRecords
    .filter(record => record.nextDueDate && record.nextDueDate >= now)
    .slice(0, 6);
  const statusRows = [
    { label: "Completed", value: totals.completed },
    { label: "Planned", value: totals.planned },
    { label: "In progress", value: totals.in_progress },
    { label: "Deferred", value: totals.deferred },
  ];
  const metricValues = {
    assets: {
      detail: "Serviceable assets",
      progress: activeAssetCount ? 100 : 0,
      value: activeAssetCount,
    },
    completed: {
      detail: "Closure rate",
      progress: completionRate,
      value: totals.completed,
    },
    open: {
      detail: "Active backlog",
      progress: percentage(openWorkCount, totals.total),
      value: openWorkCount,
    },
    risk: {
      detail: "Due or overdue",
      progress: percentage(scheduleRiskCount, totals.total),
      value: scheduleRiskCount,
    },
  };

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Maintenance</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Service Control
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
              <CardTitle>Maintenance History</CardTitle>
              <p className="text-sm text-zinc-500">Work records</p>
            </div>
            <Badge
              className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {totals.total} records
            </Badge>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {records.length ? (
              <>
                <div className="max-w-full min-w-0 px-4 pb-4">
                  <Table className="min-w-[1040px]">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead>Equipment</TableHead>
                        <TableHead>Work</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Recorded</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map(record => (
                        <TableRow
                          className="border-zinc-100 transition-colors hover:bg-zinc-50"
                          key={record.id}
                        >
                          <TableCell>
                            <div className="min-w-[13rem]">
                              <p className="font-semibold text-zinc-950">
                                {record.equipment.assetTag}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {record.equipment.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[18rem]">
                              <p className="truncate font-semibold text-zinc-950">
                                {record.type}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                {record.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <MaintenanceStatusBadge status={record.status} />
                          </TableCell>
                          <TableCell>
                            <DueDateBadge dueDate={record.nextDueDate} now={now} />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-zinc-950">
                              {compactDateFormatter.format(record.performedAt)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {record.recordedBy?.name ?? "System"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Link
                              className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                              href={`/equipment/view-more/${record.equipment.id}`}
                            >
                              View more
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  page={page}
                  searchParams={params}
                  total={totals.total}
                />
              </>
            ) : (
              <EmptyState icon={Wrench} label="No maintenance records" />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card
          className="h-full w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle>Status Mix</CardTitle>
              <p className="text-sm text-zinc-500">Work state</p>
            </div>
            <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0">
            {statusRows.map((item, index) => (
              <DistributionRow
                accent={statusAccents[index % statusAccents.length]}
                key={item.label}
                label={item.label}
                total={totals.total}
                value={item.value}
              />
            ))}
          </CardContent>
        </Card>

        <Card
          className="h-full w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle>Next Due</CardTitle>
              <p className="text-sm text-zinc-500">Upcoming service</p>
            </div>
            <Badge
              className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {upcomingRecords.length} soon
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
            {upcomingRecords.map(record => (
              <Link
                className="group rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                href={`/equipment/view-more/${record.equipment.id}`}
                key={record.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {record.equipment.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {record.type}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-zinc-950">
                    {record.nextDueDate
                      ? compactDateFormatter.format(record.nextDueDate)
                      : "N/A"}
                  </span>
                </div>
              </Link>
            ))}
            {!upcomingRecords.length && <EmptyState label="No scheduled work" />}
          </CardContent>
        </Card>
      </section>

      {canRecordMaintenance ? (
        <section className="w-full max-w-full min-w-0">
          <MaintenanceForm
            action={createMaintenanceRecordAction}
            equipment={equipment}
          />
        </section>
      ) : null}
    </div>
  );
}

type MetricIcon = typeof Wrench;

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
          <div className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
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

function MaintenanceStatusBadge({ status }: { status: string }) {
  const className =
    status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "IN_PROGRESS"
        ? "border-zinc-200 bg-zinc-950 text-white"
        : status === "DEFERRED"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {formatMaintenanceStatus(status)}
    </Badge>
  );
}

function DueDateBadge({ dueDate, now }: { dueDate: Date | null; now: Date }) {
  if (!dueDate) {
    return (
      <Badge
        className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-500"
        variant="outline"
      >
        Not scheduled
      </Badge>
    );
  }

  if (isOverdue(dueDate, now)) {
    return (
      <Badge
        className="rounded-full border-red-200 bg-red-50 text-red-600"
        variant="outline"
      >
        Overdue
      </Badge>
    );
  }

  if (isDueSoon(dueDate, now)) {
    return (
      <Badge
        className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
        variant="outline"
      >
        {compactDateFormatter.format(dueDate)}
      </Badge>
    );
  }

  return (
    <Badge
      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
      variant="outline"
    >
      {compactDateFormatter.format(dueDate)}
    </Badge>
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
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-950">{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600 shadow-sm">
          {value}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: accent, width: `${width}%` }}
        />
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
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-4 text-zinc-400" />}
        <span>{label}</span>
      </div>
    </div>
  );
}

function isDueSoon(dueDate: Date | null, now: Date) {
  if (!dueDate || dueDate < now) {
    return false;
  }

  return dueDate.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 30;
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
