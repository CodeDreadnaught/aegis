import type { Metadata } from "next";
import { Fingerprint, LockKey, Pulse } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default async function AuditPage() {
  await requirePermission("viewAudit");
  const auditLogs = await getAuditTrail();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Trace significant user and system actions without displaying credentials, tokens or session secrets."
        eyebrow="Administrative traceability"
        title="Audit Trail"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <AuditPrinciple
          icon={Pulse}
          label="Event stream"
          value={`${auditLogs.length} recent entries`}
        />
        <AuditPrinciple
          icon={Fingerprint}
          label="Traceability"
          value="User, action and entity linkage"
        />
        <AuditPrinciple
          icon={LockKey}
          label="Secret handling"
          value="Sensitive metadata redacted"
        />
      </div>

      <Card className="premium-panel motion-card">
        <CardHeader className="border-b">
          <CardTitle>Recent audit entries</CardTitle>
          <CardDescription>
            Latest persisted audit records across account, equipment,
            operational and maintenance workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead className="pr-6">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((entry) => (
                  <TableRow key={entry.id} className="data-row">
                    <TableCell className="pl-6">
                      <Badge variant="secondary">
                        {formatAuditAction(entry.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {entry.user?.name ?? "System"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.user?.email ?? "No user account"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {entry.entityType}
                      </div>
                      <div className="max-w-44 truncate text-xs text-muted-foreground">
                        {entry.entityId ?? "No entity id"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-96 truncate text-xs text-muted-foreground">
                        {safeMetadataSummary(entry.metadata)}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6">
                      {entry.timestamp.toLocaleString("en-GB")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                <Fingerprint className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                No audit entries yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Audited Server Actions will appear here as users operate the
                system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AuditIcon = typeof Pulse;

function AuditPrinciple({
  icon: Icon,
  label,
  value,
}: {
  icon: AuditIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="motion-card">
      <CardContent className="flex-row items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
