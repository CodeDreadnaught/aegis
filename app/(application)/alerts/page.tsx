import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  ShieldWarning,
  Warning,
} from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { MessageViewDialog } from "@/components/message-view-dialog";
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
  const metrics = [
    {
      accent: "bg-[#ef4444]",
      detail: "Open Items",
      icon: Bell,
      label: "Active",
      progress: percentage(totals.active, totals.total),
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      value: totals.active,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: "Awaiting closure",
      icon: Warning,
      label: "Acknowledged",
      progress: percentage(totals.acknowledged, totals.total),
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      value: totals.acknowledged,
    },
    {
      accent: "bg-[#f97316]",
      detail: "High severity",
      icon: ShieldWarning,
      label: "Risk",
      progress: percentage(totals.highSeverity, totals.total),
      tone: "bg-[#fff4e8] text-[#c2410c]",
      value: totals.highSeverity,
    },
    {
      accent: "bg-[#2f9da7]",
      detail: "Model generated",
      icon: CheckCircle,
      label: "Model Events",
      progress: percentage(totals.predictionRisk, totals.total),
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: totals.predictionRisk,
    },
  ];

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Alerts</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Response Queue
          </h1>
        </div>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <MetricCard
            accent={metric.accent}
            detail={metric.detail}
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            progress={metric.progress}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      <section className="w-full max-w-full min-w-0">
        <Card
          className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div className="min-w-0">
              <CardTitle>Alert Queue</CardTitle>
              <p className="text-sm text-zinc-500">
                Equipment risk and response state
              </p>
            </div>
            <Badge
              className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
              variant="outline"
            >
              {totals.total} alerts
            </Badge>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            {alerts.length ? (
              <>
                <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
                  <Table className="min-w-[1040px]">
                    <TableHeader>
                      <TableRow className="border-zinc-200 bg-zinc-50">
                        <TableHead className="w-[18rem]">Equipment</TableHead>
                        <TableHead className="w-[9rem]">Severity</TableHead>
                        <TableHead className="w-[13rem]">Message</TableHead>
                        <TableHead className="w-[10rem]">Status</TableHead>
                        <TableHead className="w-[11rem]">Response</TableHead>
                        <TableHead className="w-[8rem]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map(alert => (
                        <TableRow
                          className="border-zinc-100 align-middle transition-colors hover:bg-zinc-50"
                          key={alert.id}
                        >
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-950">
                                {alert.equipment.assetTag}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {alert.equipment.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`rounded-full ${alertSeverityClass(alert.severity)}`}
                              variant="outline"
                            >
                              {formatAlertLabel(alert.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <MessageViewDialog
                              message={alert.message}
                              meta={`${formatAlertLabel(alert.type)} / ${compactDateFormatter.format(alert.createdAt)} ${timeFormatter.format(alert.createdAt)}`}
                              title="Alert message"
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={alert.status} />
                          </TableCell>
                          <TableCell>
                            <div className="grid w-36 gap-2">
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
                                        "h-9 w-full justify-center rounded-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white",
                                    })}
                                    type="submit"
                                  >
                                    Acknowledge
                                  </button>
                                </ActionToastForm>
                              )}
                              {alert.status !== "RESOLVED" ? (
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
                                    className={buttonVariants({
                                      variant: "outline",
                                      size: "sm",
                                      className:
                                        "h-9 w-full justify-center rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-[#009966] hover:text-white",
                                    })}
                                    type="submit"
                                  >
                                    Resolve
                                  </button>
                                </ActionToastForm>
                              ) : (
                                <span className="inline-flex h-9 w-full items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700">
                                  Closed
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
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
      </section>

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-2">
        <Card
          className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-1">
            <div className="min-w-0">
              <CardTitle>Response Mix</CardTitle>
              <p className="text-sm text-zinc-500">Alert state</p>
            </div>
            <Bell aria-hidden="true" className="size-5 text-zinc-500" />
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0">
            <DistributionRow
              accent="bg-[#ef4444]"
              label="Active"
              total={totals.total}
              value={totals.active}
            />
            <DistributionRow
              accent="bg-[#f2bd3f]"
              label="Acknowledged"
              total={totals.total}
              value={totals.acknowledged}
            />
            <DistributionRow
              accent="bg-[#2f9da7]"
              label="Resolved"
              total={totals.total}
              value={totals.resolved}
            />
          </CardContent>
        </Card>

        <Card
          className="h-fit w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
          data-motion="panel"
        >
          <CardHeader className="pb-1">
            <CardTitle>Alert Source</CardTitle>
            <p className="text-sm text-zinc-500">Prediction-led events</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-4xl font-semibold leading-none text-zinc-950">
                {totals.predictionRisk}
              </p>
              <p className="mt-2 text-sm leading-6 text-red-900/70">
                Predictive-risk alerts created from model outputs across the
                monitored fleet.
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#ef4444]"
                  style={{ width: `${percentage(totals.predictionRisk, totals.total)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type AlertIcon = typeof Bell;

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
  icon: AlertIcon;
  label: string;
  progress: number;
  tone: string;
  value: number;
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

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "ACTIVE"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "ACKNOWLEDGED"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <Badge className={`rounded-full ${className}`} variant="outline">
      {formatAlertLabel(status)}
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
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-950">{label}</span>
        <span className="font-medium text-zinc-500">{value}</span>
      </div>
      <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={`block h-full rounded-full ${accent}`}
          style={{ width: `${width}%` }}
        />
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: AlertIcon; label: string }) {
  return (
    <div className="m-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4 text-zinc-400" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
