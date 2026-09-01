import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  ChartLineUp,
  DownloadSimple,
  HardHat,
  Wrench,
} from "@phosphor-icons/react/ssr";

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
import { csvDataHref, toCsv } from "@/features/reports/csv";
import { getReportsWorkspace } from "@/features/reports/queries";
import { paginateItems, parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: " Reports",
};

const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

type ReportsPageProps = {
  searchParams?: Promise<{
    alertsPage?: string | string[];
    equipmentPage?: string | string[];
    maintenancePage?: string | string[];
    predictionsPage?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requirePermission("viewReports");
  const params = await searchParams;
  const reports = await getReportsWorkspace();
  const paginatedEquipment = paginateItems(
    reports.equipment,
    parsePageParam(params?.equipmentPage),
  );
  const paginatedMaintenance = paginateItems(
    reports.maintenance,
    parsePageParam(params?.maintenancePage),
  );
  const paginatedPredictions = paginateItems(
    reports.predictions,
    parsePageParam(params?.predictionsPage),
  );
  const paginatedAlerts = paginateItems(
    reports.alerts,
    parsePageParam(params?.alertsPage),
  );

  const equipmentCsv = toCsv(
    reports.equipment.map(equipment => ({
      assetTag: equipment.assetTag,
      name: equipment.name,
      category: equipment.category,
      status: equipment.status,
      location: equipment.location,
    })),
  );
  const maintenanceCsv = toCsv(
    reports.maintenance.map(record => ({
      assetTag: record.equipment.assetTag,
      equipment: record.equipment.name,
      type: record.type,
      status: record.status,
      performedAt: record.performedAt.toISOString(),
      nextDueDate: record.nextDueDate?.toISOString() ?? null,
    })),
  );
  const predictionCsv = toCsv(
    reports.predictions.map(prediction => ({
      assetTag: prediction.equipment.assetTag,
      equipment: prediction.equipment.name,
      riskLevel: prediction.riskLevel,
      healthScore: prediction.healthScore.toString(),
      failureProbability: prediction.failureProbability.toString(),
      createdAt: prediction.createdAt.toISOString(),
    })),
  );
  const alertCsv = toCsv(
    reports.alerts.map(alert => ({
      assetTag: alert.equipment.assetTag,
      equipment: alert.equipment.name,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
    })),
  );
  const highRiskReports = reports.predictions.filter(
    prediction => prediction.riskLevel === "HIGH",
  ).length;

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-motion="reveal">
          <p className="text-sm font-medium text-zinc-500">Reports</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 md:text-4xl">
            Export Center
          </h1>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <MetricCard
          detail="Fleet register"
          icon={HardHat}
          label="Equipment"
          value={reports.equipment.length}
        />
        <MetricCard
          detail="Service history"
          icon={Wrench}
          label="Maintenance"
          value={reports.maintenance.length}
        />
        <MetricCard
          detail={`${highRiskReports} high risk`}
          icon={ChartLineUp}
          label="Predictions"
          value={reports.predictions.length}
        />
        <MetricCard
          detail="Response records"
          icon={Bell}
          label="Alerts"
          value={reports.alerts.length}
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2">
        <ReportPanel
          downloadHref={csvDataHref(equipmentCsv)}
          filename="aegis-equipment-report.csv"
          rowCount={reports.equipment.length}
          title="Equipment CSV"
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[36%]">Asset</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="hidden text-center md:table-cell">
                  Location
                </TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEquipment.items.map(equipment => (
                <TableRow
                  className="border-zinc-100 transition-colors hover:bg-zinc-50"
                  key={equipment.assetTag}
                >
                  <TableCell>
                    <p className="font-semibold text-zinc-950">
                      {equipment.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {equipment.name}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {equipment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-zinc-500 md:table-cell">
                    {equipment.location}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      className="text-sm font-semibold text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                      href={`/equipment/view-more/${equipment.id}`}
                    >
                      View more
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            page={paginatedEquipment.currentPage}
            pageParam="equipmentPage"
            searchParams={params}
            total={paginatedEquipment.total}
          />
        </ReportPanel>

        <ReportPanel
          downloadHref={csvDataHref(maintenanceCsv)}
          filename="aegis-maintenance-report.csv"
          rowCount={reports.maintenance.length}
          title="Maintenance CSV"
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[32%]">Equipment</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="hidden text-center md:table-cell">
                  Performed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMaintenance.items.map(record => (
                <TableRow
                  className="border-zinc-100 transition-colors hover:bg-zinc-50"
                  key={`${record.equipment.assetTag}-${record.performedAt.toISOString()}`}
                >
                  <TableCell>
                    <p className="font-semibold text-zinc-950">
                      {record.equipment.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {record.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="truncate font-semibold text-zinc-950">
                      {record.type}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      Next{" "}
                      {record.nextDueDate
                        ? compactDateFormatter.format(record.nextDueDate)
                        : "not scheduled"}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-zinc-500 md:table-cell">
                    {compactDateFormatter.format(record.performedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            page={paginatedMaintenance.currentPage}
            pageParam="maintenancePage"
            searchParams={params}
            total={paginatedMaintenance.total}
          />
        </ReportPanel>

        <ReportPanel
          downloadHref={csvDataHref(predictionCsv)}
          filename="aegis-prediction-report.csv"
          rowCount={reports.predictions.length}
          title="Prediction CSV"
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[36%]">Equipment</TableHead>
                <TableHead className="text-center">Risk</TableHead>
                <TableHead className="text-center">Health</TableHead>
                <TableHead className="hidden text-center md:table-cell">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPredictions.items.map(prediction => (
                <TableRow
                  className="border-zinc-100 transition-colors hover:bg-zinc-50"
                  key={`${prediction.equipment.assetTag}-${prediction.createdAt.toISOString()}`}
                >
                  <TableCell>
                    <p className="font-semibold text-zinc-950">
                      {prediction.equipment.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {prediction.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {prediction.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-zinc-950">
                    {prediction.healthScore.toString()}%
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-zinc-500 md:table-cell">
                    {compactDateFormatter.format(prediction.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            page={paginatedPredictions.currentPage}
            pageParam="predictionsPage"
            searchParams={params}
            total={paginatedPredictions.total}
          />
        </ReportPanel>

        <ReportPanel
          downloadHref={csvDataHref(alertCsv)}
          filename="aegis-alert-report.csv"
          rowCount={reports.alerts.length}
          title="Alert CSV"
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[30%]">Equipment</TableHead>
                <TableHead className="text-center">Severity</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="hidden text-center md:table-cell">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAlerts.items.map(alert => (
                <TableRow
                  className="border-zinc-100 transition-colors hover:bg-zinc-50"
                  key={`${alert.equipment.assetTag}-${alert.createdAt.toISOString()}`}
                >
                  <TableCell>
                    <p className="font-semibold text-zinc-950">
                      {alert.equipment.assetTag}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {alert.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-2 text-sm font-medium text-zinc-950">
                      {alert.message}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {compactDateFormatter.format(alert.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-zinc-500 md:table-cell">
                    {alert.status}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            page={paginatedAlerts.currentPage}
            pageParam="alertsPage"
            searchParams={params}
            total={paginatedAlerts.total}
          />
        </ReportPanel>
      </section>
    </div>
  );
}

type ReportIcon = typeof DownloadSimple;

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: ReportIcon;
  label: string;
  value: number;
}) {
  return (
    <Card
      className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
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

function ReportPanel({
  children,
  downloadHref,
  filename,
  rowCount,
  title,
}: {
  children: ReactNode;
  downloadHref: string;
  filename: string;
  rowCount: number;
  title: string;
}) {
  return (
    <Card
      className="rounded-lg border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-zinc-500">{rowCount} rows</p>
        </div>
        <a
          aria-label={`Download ${title}`}
          className={buttonVariants({
            variant: "outline",
            size: "icon",
            className:
              "size-10 rounded-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white",
          })}
          download={filename}
          href={downloadHref || "data:text/csv;charset=utf-8,"}
        >
          <DownloadSimple aria-hidden="true" className="size-4" />
        </a>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4">{children}</div>
      </CardContent>
    </Card>
  );
}
