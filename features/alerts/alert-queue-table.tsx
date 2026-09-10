"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCircle, Checks } from "@phosphor-icons/react";

import { MessageViewDialog } from "@/components/message-view-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  alertSeverityClass,
  formatAlertLabel,
} from "@/features/alerts/formatting";
import { getActionErrorMessage } from "@/lib/action-error";
import { cn } from "@/lib/utils";

export type AlertQueueTableAlert = {
  id: string;
  message: string;
  messageMeta: string;
  severity: string;
  status: string;
  equipment: {
    assetTag: string;
    id: string;
    name: string;
  };
};

export type AlertQueueStatusFilter =
  | ""
  | "ACTIVE"
  | "ACKNOWLEDGED"
  | "RESOLVED";

type SingleAlertAction = (id: string) => Promise<void>;
type BulkAlertAction = (ids: string[]) => Promise<{ count: number }>;

type AlertQueueTableProps = {
  acknowledgeAlertAction: SingleAlertAction;
  acknowledgeAlertsAction: BulkAlertAction;
  alerts: AlertQueueTableAlert[];
  emptyLabel: string;
  resolveAlertAction: SingleAlertAction;
  resolveAlertsAction: BulkAlertAction;
  statusFilter: AlertQueueStatusFilter;
};

const statusOptions: Array<{ label: string; value: AlertQueueStatusFilter }> = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Acknowledged", value: "ACKNOWLEDGED" },
  { label: "Resolved", value: "RESOLVED" },
];

export function AlertQueueTable({
  acknowledgeAlertAction,
  acknowledgeAlertsAction,
  alerts,
  emptyLabel,
  resolveAlertAction,
  resolveAlertsAction,
  statusFilter,
}: AlertQueueTableProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectableIds = useMemo(
    () =>
      alerts
        .filter((alert) => alert.status !== "RESOLVED")
        .map((alert) => alert.id),
    [alerts],
  );
  const activeSelectedIds = alerts
    .filter((alert) => selectedSet.has(alert.id) && alert.status === "ACTIVE")
    .map((alert) => alert.id);
  const unresolvedSelectedIds = alerts
    .filter((alert) => selectedSet.has(alert.id) && alert.status !== "RESOLVED")
    .map((alert) => alert.id);
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
  const hasSelection = selectedIds.length > 0;
  const isBusy = isPending || pendingAction !== null;

  function buildStatusHref(value: AlertQueueStatusFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }

    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  }

  function handleSelectAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : selectableIds);
  }

  function handleRowSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((selectedId) => selectedId !== id);
    });
  }

  function runSingleAction(
    action: SingleAlertAction,
    id: string,
    labels: {
      errorTitle: string;
      successDescription: string;
      successTitle: string;
    },
  ) {
    setPendingAction(id);
    startTransition(async () => {
      try {
        await action(id);
        router.refresh();
        setSelectedIds((current) =>
          current.filter((selectedId) => selectedId !== id),
        );
        toast.success({
          title: labels.successTitle,
          description: labels.successDescription,
        });
      } catch (error) {
        toast.error({
          title: labels.errorTitle,
          description: getActionErrorMessage(error),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function runBulkAction(
    action: BulkAlertAction,
    ids: string[],
    labels: {
      emptyDescription: string;
      emptyTitle: string;
      errorTitle: string;
      successAction: string;
      successTitle: string;
    },
  ) {
    if (!ids.length) {
      toast.error({
        title: labels.emptyTitle,
        description: labels.emptyDescription,
      });
      return;
    }

    setPendingAction(labels.successAction);
    startTransition(async () => {
      try {
        const result = await action(ids);
        router.refresh();
        setSelectedIds([]);

        if (!result.count) {
          toast.info({
            title: "No eligible alerts updated",
            description: "The selected alerts were already in the requested state.",
          });
          return;
        }

        toast.success({
          title: labels.successTitle,
          description: `${result.count.toLocaleString()} ${formatPlural(
            result.count,
            "alert",
          )} ${labels.successAction}.`,
        });
      } catch (error) {
        toast.error({
          title: labels.errorTitle,
          description: getActionErrorMessage(error),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <>
      <div className="grid gap-3 border-y border-zinc-100 px-4 py-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <nav
              aria-label="Filter alerts by status"
              className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1 sm:inline-grid sm:w-fit sm:grid-cols-4"
            >
              {statusOptions.map((option) => {
                const isActive = statusFilter === option.value;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 min-w-0 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#009966]/25",
                      isActive
                        ? "bg-white text-zinc-950 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-950",
                    )}
                    href={buildStatusHref(option.value)}
                    key={option.value || "ALL"}
                    onClick={() => setSelectedIds([])}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="h-9 rounded-full border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-950 hover:text-white"
                disabled={!selectableIds.length || isBusy}
                onClick={handleSelectAllVisible}
                type="button"
                variant="outline"
              >
                <Checks />
                {allVisibleSelected ? "Clear visible" : "Select all visible"}
              </Button>
              {hasSelection ? (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500">
                  {selectedIds.length.toLocaleString()} selected
                </span>
              ) : null}
            </div>
          </div>
          {hasSelection ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center xl:justify-end">
              <Button
                className="h-9 rounded-full border-zinc-200 bg-white px-3 text-zinc-950 hover:bg-zinc-950 hover:text-white"
                disabled={!activeSelectedIds.length || isBusy}
                onClick={() =>
                  runBulkAction(acknowledgeAlertsAction, activeSelectedIds, {
                    emptyDescription: "Select at least one active alert to acknowledge.",
                    emptyTitle: "No active alerts selected",
                    errorTitle: "Selected alerts were not acknowledged",
                    successAction: "acknowledged",
                    successTitle: "Alerts acknowledged",
                  })
                }
                type="button"
                variant="outline"
              >
                <CheckCircle />
                Acknowledge selected
              </Button>
              <Button
                className="h-9 rounded-full border-emerald-200 bg-emerald-50 px-3 text-emerald-700 hover:bg-[#009966] hover:text-white"
                disabled={!unresolvedSelectedIds.length || isBusy}
                onClick={() =>
                  runBulkAction(resolveAlertsAction, unresolvedSelectedIds, {
                    emptyDescription: "Select at least one unresolved alert to resolve.",
                    emptyTitle: "No unresolved alerts selected",
                    errorTitle: "Selected alerts were not resolved",
                    successAction: "resolved",
                    successTitle: "Alerts resolved",
                  })
                }
                type="button"
                variant="outline"
              >
                <CheckCircle />
                Resolve selected
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {alerts.length ? (
        <div className="max-w-full min-w-0 overflow-x-auto px-4 pb-4">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="w-[4rem]">Select</TableHead>
                <TableHead className="w-[18rem]">Equipment</TableHead>
                <TableHead className="w-[9rem]">Severity</TableHead>
                <TableHead className="w-[13rem]">Message</TableHead>
                <TableHead className="w-[10rem]">Status</TableHead>
                <TableHead className="w-[11rem]">Response</TableHead>
                <TableHead className="w-[8rem]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const isResolved = alert.status === "RESOLVED";

                return (
                  <TableRow
                    className="border-zinc-100 align-middle transition-colors hover:bg-zinc-50 data-[state=selected]:bg-zinc-50"
                    data-state={selectedSet.has(alert.id) ? "selected" : undefined}
                    key={alert.id}
                  >
                    <TableCell>
                      <input
                        aria-label={`Select alert for ${alert.equipment.assetTag}`}
                        checked={selectedSet.has(alert.id)}
                        className="size-4 rounded border-zinc-300 text-zinc-950 outline-none transition focus-visible:ring-3 focus-visible:ring-[#009966]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isResolved || isBusy}
                        onChange={(event) =>
                          handleRowSelection(alert.id, event.currentTarget.checked)
                        }
                        type="checkbox"
                      />
                    </TableCell>
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
                        meta={alert.messageMeta}
                        title="Alert message"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} />
                    </TableCell>
                    <TableCell>
                      <div className="grid w-36 gap-2">
                        {alert.status === "ACTIVE" && (
                          <Button
                            className="h-9 w-full justify-center rounded-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white"
                            disabled={isBusy}
                            onClick={() =>
                              runSingleAction(acknowledgeAlertAction, alert.id, {
                                errorTitle: "Alert was not acknowledged",
                                successDescription:
                                  "The alert moved into the acknowledged queue.",
                                successTitle: "Alert acknowledged",
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status !== "RESOLVED" ? (
                          <Button
                            className="h-9 w-full justify-center rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-[#009966] hover:text-white"
                            disabled={isBusy}
                            onClick={() =>
                              runSingleAction(resolveAlertAction, alert.id, {
                                errorTitle: "Alert was not resolved",
                                successDescription:
                                  "The alert has been marked as resolved.",
                                successTitle: "Alert resolved",
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Resolve
                          </Button>
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyAlerts label={emptyLabel} />
      )}
    </>
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

function EmptyAlerts({ label }: { label: string }) {
  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" className="size-4 text-zinc-400" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function formatPlural(count: number, singular: string) {
  return count === 1 ? singular : `${singular}s`;
}
