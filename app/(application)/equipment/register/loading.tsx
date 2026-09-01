import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-label="Loading register equipment" className="space-y-6">
      <Skeleton className="h-5 w-16 rounded-full" />

      <div className="mb-6 grid gap-2" data-motion="reveal">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-10 w-72 max-w-[80vw] rounded-lg" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-full" />
      </div>

      <Panel className="premium-panel p-0">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <Skeleton className="h-6 w-44 rounded-lg" />
        </div>
        <div className="grid gap-5 px-4 py-5 sm:px-6">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-11 rounded-full" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>

          <Panel className="rounded-lg p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <FieldSkeleton key={index} />
              ))}
              <div className="grid gap-2 md:col-span-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <FieldSkeleton key={`meta-${index}`} />
              ))}
              <div className="grid gap-2 md:col-span-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-36 rounded-full" />
                  <Skeleton className="h-3 w-56 max-w-[60vw] rounded-full" />
                </div>
                <Skeleton className="size-4 rounded" />
              </div>
            </div>
          </Panel>

          <Skeleton className="h-11 w-full rounded-full bg-[#009966]/20" />
        </div>
      </Panel>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-24 rounded-full" />
      <Skeleton className="h-11 rounded-lg" />
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
      className={`rounded-[1.35rem] border border-zinc-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
