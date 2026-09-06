import type { Metadata } from "next";
import {
  Bell,
  CheckCircle,
  ShieldWarning,
  Warning,
} from "@phosphor-icons/react/ssr";

import { PaginationControls } from "@/components/table-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acknowledgeAlertAction,
  acknowledgeAlertsAction,
  resolveAlertAction,
  resolveAlertsAction,
} from "@/features/alerts/actions";
import { AlertQueueTable } from "@/features/alerts/alert-queue-table";
import { formatAlertLabel } from "@/features/alerts/formatting";
import { getAlertsWorkspace } from "@/features/alerts/queries";
import { AlertStatus, type AlertStatus as AlertStatusValue } from "@/generated/prisma/enums";
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
  searchParams?: Promise<{
    page?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  await requirePermission("manageAlerts");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const status = parseAlertStatus(params?.status);
  const { alerts, filteredTotal, totals } = await getAlertsWorkspace(page, status);
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
      detail: "Open high severity",
      icon: ShieldWarning,
      label: "Risk",
      progress: percentage(totals.highSeverity, totals.total),
      tone: "bg-[#fff4e8] text-[#c2410c]",
      value: totals.highSeverity,
    },
    {
      accent: "bg-[#2f9da7]",
      detail: "Open model events",
      icon: CheckCircle,
      label: "Model Events",
      progress: percentage(totals.predictionRisk, totals.total),
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: totals.predictionRisk,
    },
  ];
  const alertRows = alerts.map((alert) => ({
    id: alert.id,
    message: alert.message,
    messageMeta: `${formatAlertLabel(alert.type)} / ${compactDateFormatter.format(alert.createdAt)} ${timeFormatter.format(alert.createdAt)}`,
    severity: alert.severity,
    status: alert.status,
    equipment: {
      assetTag: alert.equipment.assetTag,
      id: alert.equipment.id,
      name: alert.equipment.name,
    },
  }));

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
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            <AlertQueueTable
              acknowledgeAlertAction={acknowledgeAlertAction}
              key={`${status ?? "ALL"}-${page}`}
              acknowledgeAlertsAction={acknowledgeAlertsAction}
              alerts={alertRows}
              emptyLabel={
                status
                  ? `No ${formatAlertLabel(status).toLowerCase()} alerts found`
                  : "No alerts stored"
              }
              resolveAlertAction={resolveAlertAction}
              resolveAlertsAction={resolveAlertsAction}
              statusFilter={status ?? ""}
            />
            <PaginationControls
              page={page}
              searchParams={params}
              total={filteredTotal}
            />
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
          <CardHeader className="pb-0">
            <CardTitle>Alert Source</CardTitle>
            <p className="text-sm text-zinc-500">Prediction-led events</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
              <p className="text-3xl font-semibold leading-none text-zinc-950">
                {totals.predictionRisk}
              </p>
              <p className="mt-1.5 text-sm leading-5 text-red-900/70">
                Open predictive-risk alerts generated from model outputs across
                the monitored fleet.
              </p>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white">
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

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAlertStatus(value?: string | string[]): AlertStatusValue | undefined {
  const status = getParam(value)?.toUpperCase();

  switch (status) {
    case AlertStatus.ACTIVE:
    case AlertStatus.ACKNOWLEDGED:
    case AlertStatus.RESOLVED:
      return status;
    default:
      return undefined;
  }
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
