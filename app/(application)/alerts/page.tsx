import type { Metadata } from "next";
import { Bell, CheckCircle, Warning } from "@phosphor-icons/react/ssr";

import { ActionToastForm } from "@/components/action-toast-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
  acknowledgeAlertAction,
  resolveAlertAction,
} from "@/features/alerts/actions";
import {
  alertSeverityClass,
  formatAlertLabel,
} from "@/features/alerts/formatting";
import { getAlertsWorkspace } from "@/features/alerts/queries";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Alerts",
};

export default async function AlertsPage() {
  await requirePermission("manageAlerts");
  const { alerts, totals } = await getAlertsWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Track active, acknowledged and resolved maintenance alerts with equipment and prediction traceability."
        eyebrow="Alert response"
        title="Alerts"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <AlertMetric icon={Bell} label="Active" value={totals.active} />
        <AlertMetric
          icon={Warning}
          label="Acknowledged"
          value={totals.acknowledged}
        />
        <AlertMetric icon={CheckCircle} label="Resolved" value={totals.resolved} />
      </div>

      <Card className="premium-panel motion-card">
        <CardHeader className="border-b">
          <CardTitle>Alert queue</CardTitle>
          <CardDescription>
            Alerts are displayed only when persisted by prediction or rule
            workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Equipment</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id} className="data-row">
                    <TableCell className="pl-6">
                      <div className="font-medium text-foreground">
                        {alert.equipment.assetTag}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alert.equipment.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={alertSeverityClass(alert.severity)}
                        variant="outline"
                      >
                        {formatAlertLabel(alert.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-lg text-sm text-foreground">
                        {alert.message}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatAlertLabel(alert.type)} /{" "}
                        {alert.createdAt.toLocaleString("en-GB")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatAlertLabel(alert.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        {alert.status === "ACTIVE" && (
                          <ActionToastForm
                            action={acknowledgeAlertAction.bind(null, alert.id)}
                            errorTitle="Alert was not acknowledged"
                            successDescription="The alert moved into the acknowledged queue."
                            successTitle="Alert acknowledged"
                          >
                            <button
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                              type="submit"
                            >
                              Acknowledge
                            </button>
                          </ActionToastForm>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <ActionToastForm
                            action={resolveAlertAction.bind(null, alert.id)}
                            errorTitle="Alert was not resolved"
                            successDescription="The alert has been marked as resolved."
                            successTitle="Alert resolved"
                          >
                            <button
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })}
                              type="submit"
                            >
                              Resolve
                            </button>
                          </ActionToastForm>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                <Bell className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                No alerts stored
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Alerts will appear here after prediction or rule workflows
                persist actionable maintenance conditions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AlertIcon = typeof Bell;

function AlertMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: AlertIcon;
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
