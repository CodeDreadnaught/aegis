import type { Metadata } from "next";
import {
  Fingerprint,
  LockKey,
  Pulse,
  ShieldCheck,
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
import {
  formatAuditAction,
  safeMetadataSummary,
} from "@/features/audit/formatting";
import { getAuditTrail } from "@/features/audit/queries";
import { parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Audit",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

type AuditPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requirePermission("viewAudit");
  const params = await searchParams;
  const page = parsePageParam(params?.page);
  const auditTrail = await getAuditTrail(page);
  const {
    currentPage,
    entries: auditLogs,
    entityTypes,
    systemEvents,
    total,
    userEvents,
  } = auditTrail;
  const maxMetric = Math.max(1, total, userEvents, systemEvents, entityTypes);
  const metrics = [
    {
      accent: "bg-[#2f9da7]",
      detail: "Audit entries",
      icon: Pulse,
      label: "Events",
      progress: percentage(total, maxMetric),
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: total,
    },
    {
      accent: "bg-[#5ec3cf]",
      detail: "Human activity",
      icon: Fingerprint,
      label: "User Events",
      progress: percentage(userEvents, maxMetric),
      tone: "bg-[#eefbfc] text-[#146c74]",
      value: userEvents,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: "System generated",
      icon: ShieldCheck,
      label: "System",
      progress: percentage(systemEvents, maxMetric),
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      value: systemEvents,
    },
    {
      accent: "bg-[#ef4444]",
      detail: "Entity coverage",
      icon: LockKey,
      label: "Entities",
      progress: percentage(entityTypes, maxMetric),
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      value: entityTypes,
    },
  ];

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Audit</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950">
            Trace Log
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

      <Card
        className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
        data-motion="panel"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div className="min-w-0">
            <CardTitle>Recent Audit Entries</CardTitle>
            <p className="text-sm text-zinc-500">
              User, action, entity and redacted metadata
            </p>
          </div>
          <Badge
            className="shrink-0 rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
            variant="outline"
          >
            {total} entries
          </Badge>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          {auditLogs.length ? (
            <>
              <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="border-zinc-200 bg-zinc-50">
                      <TableHead className="w-[14rem]">Action</TableHead>
                      <TableHead className="w-[18rem]">Actor</TableHead>
                      <TableHead className="w-[16rem]">Entity</TableHead>
                      <TableHead className="w-[34rem]">Metadata</TableHead>
                      <TableHead className="w-[10rem]">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(entry => (
                      <TableRow
                        className="border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                        key={entry.id}
                      >
                        <TableCell>
                          <Badge
                            className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                            variant="outline"
                          >
                            {formatAuditAction(entry.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-zinc-950">
                            {entry.user?.name ?? "System"}
                          </p>
                          <p className="break-words text-xs text-zinc-500">
                            {entry.user?.email ?? "No user account"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-zinc-950">
                            {entry.entityType}
                          </p>
                          <p className="break-all text-xs text-zinc-500">
                            {entry.entityId ?? "No entity id"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          <p className="max-w-[34rem] whitespace-normal break-words leading-6">
                            {safeMetadataSummary(entry.metadata)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-zinc-950">
                            {compactDateFormatter.format(entry.timestamp)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {timeFormatter.format(entry.timestamp)}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                page={currentPage}
                searchParams={params}
                total={total}
              />
            </>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AuditIcon = typeof Pulse;

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
  icon: AuditIcon;
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
      <div className="flex items-center gap-2">
        <Fingerprint aria-hidden="true" className="size-4 text-zinc-400" />
        <span>No audit entries yet</span>
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
