import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  ChartBar,
  ClockCounterClockwise,
  Factory,
  Wrench,
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
import { createMaintenanceRecordAction } from "@/features/maintenance/actions";
import { MaintenanceForm } from "@/features/maintenance/maintenance-form";
import { getMaintenanceWorkspace } from "@/features/maintenance/queries";
import {
  formatMaintenanceStatus,
  isOverdue,
} from "@/features/maintenance/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Maintenance",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export default async function MaintenancePage() {
  await requirePermission("viewMaintenance");
  const { equipment, records, totals } = await getMaintenanceWorkspace();
  const now = new Date();
  const activeAssetCount = equipment.length;
  const overdueCount = records.filter((record) =>
    isOverdue(record.nextDueDate, now)
  ).length;
  const dueSoonCount = records.filter((record) =>
    isDueSoon(record.nextDueDate, now)
  ).length;
  const completionRate = percentage(totals.completed, totals.total);
  const openWorkCount = totals.planned + totals.in_progress + totals.deferred;
  const upcomingRecords = records
    .filter((record) => record.nextDueDate && record.nextDueDate >= now)
    .slice(0, 5);
  const statusRows = [
    { label: "Completed", value: totals.completed },
    { label: "Planned", value: totals.planned },
    { label: "In progress", value: totals.in_progress },
    { label: "Deferred", value: totals.deferred },
  ];

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Maintenance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Service Control
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard
          detail={`${activeAssetCount} serviceable assets`}
          icon={Factory}
          label="Assets"
          value={activeAssetCount}
        />
        <MetricCard
          detail={`${completionRate}% closure rate`}
          icon={CalendarCheck}
          label="Completed"
          value={totals.completed}
        />
        <MetricCard
          detail={`${dueSoonCount} due soon`}
          icon={ClockCounterClockwise}
          label="Open Work"
          value={openWorkCount}
        />
        <MetricCard
          detail={`${overdueCount} overdue`}
          icon={Wrench}
          label="Schedule Risk"
          value={overdueCount + dueSoonCount}
        />
      </section>

      <section className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card
          className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Maintenance History</CardTitle>
              <p className="text-sm text-zinc-500">
                Work records and next due dates
              </p>
            </div>
            <Badge
              className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {records.length} records
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {records.length ? (
              <div className="overflow-x-auto px-4 pb-4">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50">
                      <TableHead>Equipment</TableHead>
                      <TableHead className="text-center">Work</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Due</TableHead>
                      <TableHead className="text-center">Recorded</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
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
                        <TableCell className="text-center">
                          <div className="mx-auto max-w-[14rem]">
                            <p className="truncate font-semibold text-zinc-950">
                              {record.type}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {record.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <MaintenanceStatusBadge status={record.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <DueDateBadge dueDate={record.nextDueDate} now={now} />
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="font-medium text-zinc-950">
                            {compactDateFormatter.format(record.performedAt)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {record.recordedBy?.name ?? "System"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Link
                            className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                            href={`/equipment/${record.equipment.id}`}
                          >
                            View more
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Wrench} label="No maintenance records" />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Status Mix</CardTitle>
                <p className="text-sm text-zinc-500">Work state</p>
              </div>
              <ChartBar aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {statusRows.map((item) => (
                <DistributionRow
                  key={item.label}
                  label={item.label}
                  total={totals.total}
                  value={item.value}
                />
              ))}
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>Next Due</CardTitle>
                <p className="text-sm text-zinc-500">Upcoming service</p>
              </div>
              <Badge
                className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                variant="outline"
              >
                {dueSoonCount} soon
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {upcomingRecords.map((record) => (
                <Link
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  href={`/equipment/${record.equipment.id}`}
                  key={record.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {record.equipment.assetTag}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {record.type}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-zinc-950">
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
        </div>
      </section>

      <section>
        <MaintenanceForm
          action={createMaintenanceRecordAction}
          equipment={equipment}
        />
      </section>
    </div>
  );
}

type MetricIcon = typeof Wrench;

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
      <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-500" variant="outline">
        Not scheduled
      </Badge>
    );
  }

  if (isOverdue(dueDate, now)) {
    return (
      <Badge className="rounded-full border-red-200 bg-red-50 text-red-600" variant="outline">
        Overdue
      </Badge>
    );
  }

  if (isDueSoon(dueDate, now)) {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700" variant="outline">
        {compactDateFormatter.format(dueDate)}
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700" variant="outline">
      {compactDateFormatter.format(dueDate)}
    </Badge>
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
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-950">{label}</span>
        <span className="font-medium text-zinc-500">{value}</span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <span
          className="block h-full rounded-full bg-zinc-950"
          style={{ width: `${width}%` }}
        />
      </span>
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
