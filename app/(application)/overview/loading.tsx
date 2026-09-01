import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-label="Loading overview" className="grid gap-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-10 w-80 max-w-[80vw] rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-48 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-[1.12fr_0.78fr_0.82fr]">
        <div className="grid h-full gap-4 lg:grid-rows-[1fr_auto]">
          <div className="grid h-full items-stretch gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Panel key={index} className="min-h-36">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                  <Skeleton className="size-8 rounded-full" />
                </div>
                <div className="mt-auto grid gap-3">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </Panel>
            ))}
          </div>
          <Panel className="min-h-32">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="mt-auto h-1.5 w-full rounded-full" />
          </Panel>
        </div>

        <Panel className="min-h-[34rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-2">
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="mx-auto size-52 rounded-full" />
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-lg" />
            ))}
          </div>
        </Panel>

        <div className="grid h-full gap-4">
          <Panel className="min-h-64 bg-[#fff8e6]">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <div className="grid gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </Panel>
          <Panel className="min-h-36">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </Panel>
        </div>
      </section>

      <Panel className="min-h-[28rem]">
        <Skeleton className="h-6 w-40 rounded-lg" />
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      </Panel>

      <Panel className="min-h-80">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-4 w-44 rounded-full" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-56 rounded-[1.1rem]" />
      </Panel>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <Panel className="min-h-56">
          <Skeleton className="h-6 w-40 rounded-lg" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </Panel>
        <Panel className="min-h-56">
          <Skeleton className="h-6 w-36 rounded-lg" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </Panel>
      </section>
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
      className={`grid gap-4 rounded-[1.2rem] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}