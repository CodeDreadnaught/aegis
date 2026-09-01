import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  ShieldWarning,
  Warning,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
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
  acknowledgeAlertAction,
  resolveAlertAction,
} from "@/features/alerts/actions";
import {
  alertSeverityClass,
  formatAlertLabel,
} from "@/features/alerts/formatting";
import { getAlertsWorkspace } from "@/features/alerts/queries";
import { parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Alerts",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

type AlertsPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  await requirePermission("manageAlerts");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const { alerts, totals } = await getAlertsWorkspace(page);
  const highSeverityCount = alerts.filter(
    alert => alert.severity === "HIGH",
  ).length;
  const predictionAlerts = alerts.filter(
    alert => alert.type === "PREDICTION_RISK",
  ).length;
  const openCount = totals.active + totals.acknowledged;

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Alerts</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Response Queue
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard
          detail={`${openCount} open items`}
          icon={Bell}
          label="Active"
          value={totals.active}
        />
        <MetricCard
          detail="Awaiting closure"
          icon={Warning}
          label="Acknowledged"
          value={totals.acknowledged}
        />
        <MetricCard
          detail={`${highSeverityCount} high severity`}
          icon={ShieldWarning}
          label="Risk"
          value={highSeverityCount}
        />
        <MetricCard
          detail={`${predictionAlerts} AI generated`}
          icon={CheckCircle}
          label="Resolved"
          value={totals.resolved}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card
          className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>Alert Queue</CardTitle>
              <p className="text-sm text-zinc-500">
                Equipment risk and response state
              </p>
            </div>
            <Badge
              className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {totals.total} alerts
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length ? (
              <>
                <div className="px-4 pb-4">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead className="w-[30%]">Equipment</TableHead>
                        <TableHead className="hidden text-center md:table-cell">
                          Severity
                        </TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="hidden text-center lg:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="text-center">Response</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(alert => (
                        <TableRow
                          className="border-zinc-100 transition-colors hover:bg-zinc-50"
                          key={alert.id}
                        >
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-950">
                                {alert.equipment.assetTag}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                {alert.equipment.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            <Badge
                              className={`rounded-full ${alertSeverityClass(alert.severity)}`}
                              variant="outline"
                            >
                              {formatAlertLabel(alert.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="line-clamp-2 text-sm font-medium text-zinc-950">
                              {alert.message}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatAlertLabel(alert.type)} /{" "}
                              {compactDateFormatter.format(alert.createdAt)}{" "}
                              {timeFormatter.format(alert.createdAt)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-center lg:table-cell">
                            <StatusBadge status={alert.status} />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap justify-center gap-2">
                              {alert.status === "ACTIVE" && (
                                <ActionToastForm
                                  action={acknowledgeAlertAction.bind(
                                    null,
                                    alert.id,
                                  )}
                                  errorTitle="Alert was not acknowledged"
                                  successDescription="The alert moved into the acknowledged queue."
                                  successTitle="Alert acknowledged"
                                >
                                  <button
                                    className={buttonVariants({
                                      variant: "outline",
                                      size: "sm",
                                      className:
                                        "rounded-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white",
                                    })}
                                    type="submit"
                                  >
                                    Acknowledge
                                  </button>
                                </ActionToastForm>
                              )}
                              {alert.status !== "RESOLVED" && (
                                <ActionToastForm
                                  action={resolveAlertAction.bind(
                                    null,
                                    alert.id,
                                  )}
                                  errorTitle="Alert was not resolved"
                                  successDescription="The alert has been marked as resolved."
                                  successTitle="Alert resolved"
                                >
                                  <button
                                    className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                                    type="submit"
                                  >
                                    Resolve
                                  </button>
                                </ActionToastForm>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Link
                              className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                              href={`/equipment/view-more/${alert.equipment.id}`}
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
              <EmptyState icon={Bell} label="No alerts stored" />
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
                <CardTitle>Response Mix</CardTitle>
                <p className="text-sm text-zinc-500">Alert state</p>
              </div>
              <Bell aria-hidden="true" className="size-5 text-zinc-500" />
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              <DistributionRow
                label="Active"
                total={totals.total}
                value={totals.active}
              />
              <DistributionRow
                label="Acknowledged"
                total={totals.total}
                value={totals.acknowledged}
              />
              <DistributionRow
                label="Resolved"
                total={totals.total}
                value={totals.resolved}
              />
            </CardContent>
          </Card>

          <Card
            className="rounded-lg border-zinc-200 bg-white shadow-sm"
            data-motion="panel"
          >
            <CardHeader className="pb-2">
              <CardTitle>Alert Source</CardTitle>
              <p className="text-sm text-zinc-500">Prediction-led events</p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-5xl font-semibold leading-none text-zinc-950">
                  {predictionAlerts}
                </p>
                <p className="mt-3 text-sm font-medium text-red-900/70">
                  alerts generated from predictive risk output
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

type AlertIcon = typeof Bell;

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: AlertIcon;
  label: string;
  value: number;
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
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
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

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ACTIVE"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "ACKNOWLEDGED"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {formatAlertLabel(status)}
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
  const width = total ? Math.round((value / total) * 100) : 0;

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

function EmptyState({ icon: Icon, label }: { icon: AlertIcon; label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4 text-zinc-400" />
        <span>{label}</span>
      </div>
    </div>
  );
}
