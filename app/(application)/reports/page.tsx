import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DownloadSimple, FileCsv, Files } from "@phosphor-icons/react/ssr";

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
import { csvDataHref, toCsv } from "@/features/reports/csv";
import { getReportsWorkspace } from "@/features/reports/queries";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Reports",
};

export default async function ReportsPage() {
  await requirePermission("viewReports");
  const reports = await getReportsWorkspace();

  const equipmentCsv = toCsv(
    reports.equipment.map((equipment) => ({
      assetTag: equipment.assetTag,
      name: equipment.name,
      category: equipment.category,
      status: equipment.status,
      location: equipment.location,
    }))
  );

  const maintenanceCsv = toCsv(
    reports.maintenance.map((record) => ({
      assetTag: record.equipment.assetTag,
      equipment: record.equipment.name,
      type: record.type,
      status: record.status,
      performedAt: record.performedAt.toISOString(),
      nextDueDate: record.nextDueDate?.toISOString() ?? null,
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="Generate equipment, maintenance, prediction, risk and alert reports with role checks and CSV-ready summaries."
        eyebrow="Reporting"
        title="Reports"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <ReportMetric label="Equipment" value={reports.equipment.length} />
        <ReportMetric label="Maintenance" value={reports.maintenance.length} />
        <ReportMetric label="Predictions" value={reports.predictions.length} />
        <ReportMetric label="Alerts" value={reports.alerts.length} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ReportCard
          description="Fleet report with category, status and location."
          downloadHref={csvDataHref(equipmentCsv)}
          filename="aegis-equipment-report.csv"
          icon={Files}
          title="Equipment Report"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.equipment.slice(0, 8).map((equipment) => (
                <TableRow key={equipment.assetTag} className="data-row">
                  <TableCell className="pl-6">
                    <div className="font-medium text-foreground">
                      {equipment.assetTag}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {equipment.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{equipment.status}</Badge>
                  </TableCell>
                  <TableCell className="pr-6">{equipment.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard
          description="Maintenance report with work type, status and due date."
          downloadHref={csvDataHref(maintenanceCsv)}
          filename="aegis-maintenance-report.csv"
          icon={FileCsv}
          title="Maintenance Report"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">Equipment</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.maintenance.slice(0, 8).map((record) => (
                <TableRow
                  key={`${record.equipment.assetTag}-${record.performedAt.toISOString()}`}
                  className="data-row"
                >
                  <TableCell className="pl-6">
                    {record.equipment.assetTag}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {record.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {record.performedAt.toLocaleDateString("en-GB")}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6">
                    <Badge variant="secondary">{record.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
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
          <DownloadSimple className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCard({
  children,
  description,
  downloadHref,
  filename,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  downloadHref: string;
  filename: string;
  icon: typeof Files;
  title: string;
}) {
  return (
    <Card className="premium-panel motion-card">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="size-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            download={filename}
            href={downloadHref || "data:text/csv;charset=utf-8,"}
          >
            <DownloadSimple />
            CSV
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
