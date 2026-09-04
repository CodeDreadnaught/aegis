import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardLoadingSkeletonProps = {
  variant?:
    | "alerts"
    | "analytics"
    | "audit"
    | "dashboard"
    | "detail"
    | "form"
    | "report"
    | "table"
    | "users";
};

export function DashboardLoadingSkeleton({
  variant = "table",
}: DashboardLoadingSkeletonProps) {
  return (
    <div
      aria-label="Loading page"
      className="grid w-full max-w-full min-w-0 gap-4"
    >
      <header className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 gap-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-11 w-[min(24rem,80vw)] rounded-lg" />
          <Skeleton className="h-5 w-[min(22rem,75vw)] rounded-full" />
        </div>
      </header>

      {variant === "alerts" ? <AlertsBody /> : null}
      {variant === "analytics" ? <AnalyticsBody /> : null}
      {variant === "audit" ? <AuditBody /> : null}
      {variant === "dashboard" ? <DashboardBody /> : null}
      {variant === "detail" ? <DetailBody /> : null}
      {variant === "form" ? <FormBody /> : null}
      {variant === "report" ? <ReportBody /> : null}
      {variant === "table" ? <TablePageBody /> : null}
      {variant === "users" ? <UsersBody /> : null}
    </div>
  );
}

function AnalyticsBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton filters rows={8} />
      <Panel className="min-h-80">
        <PanelHeading />
        <Skeleton className="h-56 w-full rounded-xl" />
      </Panel>
      <section className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="min-h-48" />
        <Panel className="min-h-48" />
      </section>
      <Panel className="min-h-96">
        <PanelHeading />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton className="h-32 w-full rounded-lg" key={index} />
          ))}
        </div>
      </Panel>
    </>
  );
}

function DashboardBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton rows={8} />
      <Panel className="min-h-80">
        <PanelHeading />
        <Skeleton className="h-56 w-full rounded-xl" />
      </Panel>
      <section className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="min-h-64" />
        <Panel className="min-h-64" />
      </section>
      <Panel className="min-h-80" />
    </>
  );
}

function DetailBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <section className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="min-h-64" />
        <Panel className="min-h-64" />
      </section>
      <TablePanelSkeleton rows={8} />
    </>
  );
}

function FormBody() {
  return (
    <Panel className="gap-6 p-6">
      <PanelHeading />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="grid gap-2" key={index}>
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </Panel>
  );
}

function ReportBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <section className="grid w-full max-w-full min-w-0 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <TablePanelSkeleton compact key={index} rows={5} />
        ))}
      </section>
    </>
  );
}

function AlertsBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton rows={8} />
      <section className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="min-h-48" />
        <Panel className="min-h-48" />
      </section>
    </>
  );
}

function AuditBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton rows={8} />
    </>
  );
}

function TablePageBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton rows={8} />
      <section className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-2">
        <Panel className="min-h-64" />
        <Panel className="min-h-64" />
      </section>
    </>
  );
}

function UsersBody() {
  return (
    <>
      <MetricSkeletonGrid />
      <TablePanelSkeleton rows={5} />
      <Panel className="min-h-72">
        <PanelHeading />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid gap-2" key={index}>
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-full" />
      </Panel>
    </>
  );
}

function MetricSkeletonGrid() {
  return (
    <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Panel key={index} className="min-h-36 rounded-[1.2rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
          <Skeleton className="mt-auto h-4 w-32 rounded-full" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </Panel>
      ))}
    </section>
  );
}

function TablePanelSkeleton({
  compact = false,
  filters = false,
  rows,
}: {
  compact?: boolean;
  filters?: boolean;
  rows: number;
}) {
  return (
    <Panel className={compact ? "min-h-80" : "min-h-[28rem]"}>
      <PanelHeading />
      {filters ? (
        <div className="grid gap-3 border-y border-zinc-100 py-3 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,0.55fr)_minmax(10rem,0.55fr)_auto]">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 overflow-hidden rounded-xl border border-zinc-200 p-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="grid min-w-[40rem] grid-cols-[1.4fr_1fr_1.3fr_0.8fr] gap-3"
            key={index}
          >
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PanelHeading() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-full" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}

function Panel({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid max-w-full min-w-0 gap-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children ?? (
        <>
          <PanelHeading />
          <Skeleton className="h-32 w-full rounded-lg" />
        </>
      )}
    </div>
  );
}
