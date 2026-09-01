import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4" aria-label="Loading equipment profile">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-11 w-[min(28rem,82vw)] rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-[min(24rem,76vw)] rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[0.95fr_0.72fr_0.9fr]">
        <div className="grid h-full gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="grid min-h-28 gap-3 rounded-[1.2rem] border border-zinc-200 bg-white p-3 shadow-sm"
              key={index}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
                <Skeleton className="size-7 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Panel />
        <Panel />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2">
        <Panel className="min-h-44" />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="min-h-80" />
        <Panel className="min-h-80" />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="min-h-72" />
        <Panel className="min-h-96" />
      </section>
    </div>
  );
}

function Panel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid gap-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="grid gap-2">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}