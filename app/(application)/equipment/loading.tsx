import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-label="Loading equipment" className="grid min-w-0 gap-4 overflow-x-hidden">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-10 w-56 max-w-[80vw] rounded-lg" />
        </div>
        <Skeleton className="hidden h-11 w-28 rounded-full bg-[#009966]/20 lg:block" />
      </section>

      <Panel className="p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_minmax(0,14rem)_auto]">
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full bg-zinc-950/15" />
        </div>
      </Panel>

      <section className="grid items-stretch gap-4 xl:grid-cols-[1.08fr_0.56fr_0.56fr]">
        <div className="grid h-full min-w-0 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Panel key={index} className="min-h-36 rounded-[1.2rem] px-3 py-2.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="grid min-w-0 gap-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
                <Skeleton className="size-7 rounded-full" />
              </div>
              <div className="mt-auto grid gap-2">
                <Skeleton className="h-4 w-32 max-w-full rounded-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="h-full min-h-[17rem]">
          <CardHeaderSkeleton titleWidth="w-24" subtitleWidth="w-28" />
          <div className="grid gap-1.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-[1rem]" />
            ))}
          </div>
        </Panel>

        <Panel className="h-full min-h-[17rem]">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="h-4 w-32 max-w-full rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid min-w-0 gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-28 max-w-full rounded-full" />
                  <Skeleton className="h-4 w-8 rounded-full" />
                </div>
                <Skeleton className="h-1.5 w-2/5 rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="min-h-[30rem] p-0">
        <div className="flex min-w-0 items-start justify-between gap-3 p-4 pb-2">
          <CardHeaderSkeleton titleWidth="w-40" subtitleWidth="w-56" />
          <Skeleton className="h-7 w-24 max-w-full rounded-full" />
        </div>
        <div className="grid gap-3 px-4 pb-4">
          <Skeleton className="h-12 rounded-lg" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="border-t border-zinc-100 px-4 py-3">
          <Skeleton className="mx-auto h-9 w-full max-w-64 rounded-full sm:ml-auto sm:mr-0" />
        </div>
      </Panel>

      <Panel className="min-h-40">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <CardHeaderSkeleton titleWidth="w-28" subtitleWidth="w-44" />
          <Skeleton className="h-7 w-24 max-w-full rounded-full" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CardHeaderSkeleton({
  subtitleWidth,
  titleWidth,
}: {
  subtitleWidth: string;
  titleWidth: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Skeleton className={`h-6 rounded-lg ${titleWidth}`} />
      <Skeleton className={`h-4 rounded-full ${subtitleWidth}`} />
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid min-w-0 gap-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
