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
import { csvDataHref, toCsv } from "@/features/reports/csv";
import { getReportsWorkspace } from "@/features/reports/queries";
import { paginateItems, parsePageParam } from "@/lib/pagination";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Reports",
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
  const maxReportRows = Math.max(
    1,
    reports.equipment.length,
    reports.maintenance.length,
    reports.predictions.length,
    reports.alerts.length,
  );
  const metrics = [
    {
      accent: "bg-[#2f9da7]",
      detail: "Fleet register",
      icon: HardHat,
      label: "Equipment",
      progress: percentage(reports.equipment.length, maxReportRows),
      tone: "bg-[#e8fbf6] text-[#146c74]",
      value: reports.equipment.length,
    },
    {
      accent: "bg-[#5ec3cf]",
      detail: "Service history",
      icon: Wrench,
      label: "Maintenance",
      progress: percentage(reports.maintenance.length, maxReportRows),
      tone: "bg-[#eefbfc] text-[#146c74]",
      value: reports.maintenance.length,
    },
    {
      accent: "bg-[#f2bd3f]",
      detail: highRiskReports ? "High risk" : "No high risk",
      icon: ChartLineUp,
      label: "Predictions",
      progress: percentage(reports.predictions.length, maxReportRows),
      tone: "bg-[#fff6dc] text-[#8a5a00]",
      value: reports.predictions.length,
    },
    {
      accent: "bg-[#ef4444]",
      detail: "Response records",
      icon: Bell,
      label: "Alerts",
      progress: percentage(reports.alerts.length, maxReportRows),
      tone: "bg-[#fff0ed] text-[#b13d2e]",
      value: reports.alerts.length,
    },
  ];

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4">
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0" data-motion="reveal">
          <p className="text-sm font-medium text-[#2f9da7]">Reports</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-zinc-950">
            Export Center
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

      <section className="grid w-full max-w-full min-w-0 items-start gap-4">
        <ReportPanel
          downloadHref={csvDataHref(equipmentCsv)}
          filename="aegis-equipment-report.csv"
          rowCount={reports.equipment.length}
          title="Equipment CSV"
        >
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[28rem]">Asset</TableHead>
                <TableHead className="w-[12rem]">Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[8rem]">Action</TableHead>
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
                    <p className="text-xs text-zinc-500">{equipment.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {equipment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {equipment.location}
                  </TableCell>
                  <TableCell>
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
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[24rem]">Equipment</TableHead>
                <TableHead>Work</TableHead>
                <TableHead className="w-[12rem]">Status</TableHead>
                <TableHead className="w-[12rem]">Performed</TableHead>
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
                    <p className="text-xs text-zinc-500">
                      {record.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-zinc-950">{record.type}</p>
                    <p className="text-xs text-zinc-500">
                      Next {" "}
                      {record.nextDueDate
                        ? compactDateFormatter.format(record.nextDueDate)
                        : "not scheduled"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
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
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[28rem]">Equipment</TableHead>
                <TableHead className="w-[12rem]">Risk</TableHead>
                <TableHead className="w-[12rem]">Health</TableHead>
                <TableHead>Date</TableHead>
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
                    <p className="text-xs text-zinc-500">
                      {prediction.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {prediction.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-950">
                    {prediction.healthScore.toString()}%
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
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
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[22rem]">Equipment</TableHead>
                <TableHead className="w-[10rem]">Severity</TableHead>
                <TableHead className="w-[12rem]">Message</TableHead>
                <TableHead className="w-[10rem]">Status</TableHead>
                <TableHead className="w-[10rem]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAlerts.items.map(alert => (
                <TableRow
                  className="border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                  key={`${alert.equipment.assetTag}-${alert.createdAt.toISOString()}`}
                >
                  <TableCell>
                    <p className="font-semibold text-zinc-950">
                      {alert.equipment.assetTag}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {alert.equipment.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-full border-zinc-200 bg-zinc-50 text-zinc-700"
                      variant="outline"
                    >
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MessageViewDialog
                      message={alert.message}
                      meta={alert.equipment.assetTag + " / " + compactDateFormatter.format(alert.createdAt)}
                      title="Alert message"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {alert.status}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {compactDateFormatter.format(alert.createdAt)}
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
  icon: ReportIcon;
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
      className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
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
      <CardContent className="min-w-0 p-0">
        <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
