import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardLoadingSkeletonProps = {
  variant?: "dashboard" | "detail" | "form" | "report" | "table";
};

export function DashboardLoadingSkeleton({
  variant = "table",
}: DashboardLoadingSkeletonProps) {
  return (
    <div className="grid w-full max-w-full min-w-0 gap-4" aria-label="Loading page">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-12 w-[min(26rem,80vw)] rounded-lg" />
          <Skeleton className="h-5 w-[min(18rem,70vw)] rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </header>

      {variant === "dashboard" ? <DashboardBody /> : null}
      {variant === "detail" ? <DetailBody /> : null}
      {variant === "form" ? <FormBody /> : null}
      {variant === "report" ? <ReportBody /> : null}
      {variant === "table" ? <TableBodySkeleton /> : null}
    </div>
  );
}

function DashboardBody() {
  return (
    <>
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <Panel key={index} className="min-h-36">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="mt-auto h-3 w-full rounded-full" />
          </Panel>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="min-h-[24rem]">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </Panel>
        <div className="grid gap-4">
          <Panel className="min-h-64" />
          <Panel className="min-h-56" />
        </div>
      </section>
    </>
  );
}

function DetailBody() {
  return (
    <>
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <Panel key={index} className="min-h-36" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel className="min-h-64" />
        <Panel className="min-h-64" />
      </section>
      <TableBodySkeleton />
    </>
  );
}

function FormBody() {
  return (
    <Panel className="gap-6 p-6">
      <Skeleton className="h-7 w-52 rounded-lg" />
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
    <section className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <TableBodySkeleton key={index} compact />
      ))}
    </section>
  );
}

function TableBodySkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Panel className={compact ? "min-h-80" : "min-h-[28rem]"}>
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-full" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: compact ? 5 : 10 }).map((_, index) => (
          <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3" key={index}>
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="hidden h-10 rounded-lg md:block" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ))}
      </div>
    </Panel>
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
        className
      )}
    >
      {children ?? (
        <>
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </>
      )}
    </div>
  );
}
