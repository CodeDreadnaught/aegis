import type { Metadata } from "next";
import { Fingerprint, LockKey, Pulse, ShieldCheck } from "@phosphor-icons/react/ssr";

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
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Audit",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AuditPage() {
  await requirePermission("viewAudit");
  const auditLogs = await getAuditTrail();
  const systemEvents = auditLogs.filter((entry) => !entry.user).length;
  const userEvents = auditLogs.length - systemEvents;
  const entityTypes = new Set(auditLogs.map((entry) => entry.entityType)).size;

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Audit</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Trace Log
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard detail="Recent entries" icon={Pulse} label="Events" value={auditLogs.length} />
        <MetricCard detail="Human activity" icon={Fingerprint} label="User Events" value={userEvents} />
        <MetricCard detail="System generated" icon={ShieldCheck} label="System" value={systemEvents} />
        <MetricCard detail="Entity coverage" icon={LockKey} label="Entities" value={entityTypes} />
      </section>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-sm" data-motion="panel">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div>
            <CardTitle>Recent Audit Entries</CardTitle>
            <p className="text-sm text-zinc-500">User, action, entity and redacted metadata</p>
          </div>
          <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700" variant="outline">
            {auditLogs.length} entries
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length ? (
            <div className="px-4 pb-4">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50">
                    <TableHead className="w-[22%]">Action</TableHead>
                    <TableHead className="hidden text-center md:table-cell">
                      Actor
                    </TableHead>
                    <TableHead className="text-center">Entity</TableHead>
                    <TableHead className="hidden lg:table-cell">Metadata</TableHead>
                    <TableHead className="text-center">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((entry) => (
                    <TableRow
                      className="border-zinc-100 transition-colors hover:bg-zinc-50"
                      key={entry.id}
                    >
                      <TableCell>
                        <Badge className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700" variant="outline">
                          {formatAuditAction(entry.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        <p className="font-semibold text-zinc-950">
                          {entry.user?.name ?? "System"}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {entry.user?.email ?? "No user account"}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-semibold text-zinc-950">
                          {entry.entityType}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {entry.entityId ?? "No entity id"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-zinc-500 lg:table-cell">
                        <p className="truncate">
                          {safeMetadataSummary(entry.metadata)}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
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
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: AuditIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm" data-motion="metric">
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
