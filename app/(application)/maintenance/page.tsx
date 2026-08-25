import type { Metadata } from "next";
import {
  CalendarCheck,
  ClockCounterClockwise,
  Wrench,
} from "@phosphor-icons/react/ssr";

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

export default async function MaintenancePage() {
  await requirePermission("viewMaintenance");
  const { equipment, records, totals } = await getMaintenanceWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Record maintenance events, track planned work and keep equipment history available for reporting and risk review."
        eyebrow="Maintenance control"
        title="Maintenance"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wrench} label="Records" value={totals.total} />
        <MetricCard
          icon={CalendarCheck}
          label="Planned"
          value={totals.planned}
        />
        <MetricCard
          icon={ClockCounterClockwise}
          label="In progress"
          value={totals.in_progress}
        />
        <MetricCard
          icon={CalendarCheck}
          label="Completed"
          value={totals.completed}
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="premium-panel motion-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ClockCounterClockwise className="size-5 text-primary" />
              Maintenance history
            </CardTitle>
            <CardDescription>
              Recent and planned records ordered by due date and activity date.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {records.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6">Equipment</TableHead>
                    <TableHead>Work</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="pr-6">Recorded by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className="data-row">
                      <TableCell className="pl-6">
                        <div className="font-medium text-foreground">
                          {record.equipment.assetTag}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.equipment.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {record.type}
                        </div>
                        <div className="max-w-80 truncate text-xs text-muted-foreground">
                          {record.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.status === "COMPLETED"
                              ? "bg-emerald-600 text-white"
                              : undefined
                          }
                          variant={
                            record.status === "COMPLETED"
                              ? "default"
                              : "outline"
                          }
                        >
                          {formatMaintenanceStatus(record.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DueDateBadge dueDate={record.nextDueDate} />
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="text-sm text-foreground">
                          {record.recordedBy?.name ?? "System"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.performedAt.toLocaleDateString("en-GB")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                  <Wrench className="size-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  No maintenance records
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Record completed work or planned maintenance to build an
                  auditable equipment history.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <MaintenanceForm
          action={createMaintenanceRecordAction}
          equipment={equipment}
        />
      </div>
    </div>
  );
}

type MetricIcon = typeof Wrench;

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: MetricIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="motion-card">
      <CardContent className="flex-row items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function DueDateBadge({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) {
    return <Badge variant="outline">Not scheduled</Badge>;
  }

  if (isOverdue(dueDate)) {
    return (
      <Badge className="bg-destructive/10 text-destructive" variant="outline">
        Overdue
      </Badge>
    );
  }

  return <Badge variant="secondary">{dueDate.toLocaleDateString("en-GB")}</Badge>;
}
