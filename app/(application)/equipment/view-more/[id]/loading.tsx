import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      aria-label="Loading equipment profile"
      className="grid w-full max-w-full min-w-0 gap-4"
    >
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 gap-3">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-11 w-full max-w-md rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-full max-w-sm rounded-full" />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <Skeleton className="h-11 w-full rounded-full sm:w-24" />
          <Skeleton className="h-11 w-full rounded-full sm:w-36" />
          <Skeleton className="h-11 w-full rounded-full sm:w-24" />
        </div>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1.12fr)]">
        <div className="grid h-full min-w-0 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="grid min-h-32 w-full max-w-full min-w-0 gap-3 rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3.5 shadow-sm"
              key={index}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 gap-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-full" />
              </div>
              <Skeleton className="mt-auto h-4 w-32 rounded-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>

        <Panel className="min-h-[17rem]">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <Skeleton className="h-6 w-32 rounded-lg" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            </div>
            <div className="grid gap-3 border-t border-zinc-100 pt-4">
              <Skeleton className="h-6 w-36 rounded-lg" />
              <div className="grid overflow-hidden rounded-xl border border-zinc-200 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-none" />
                <Skeleton className="h-24 rounded-none" />
                <Skeleton className="h-24 rounded-none" />
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="w-full max-w-full min-w-0">
        <Panel>
          <Skeleton className="h-7 w-40 rounded-lg" />
          <div className="grid gap-2 rounded-lg border border-zinc-200 p-3">
            <Skeleton className="h-8 w-full rounded-md" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-9 w-full rounded-md" key={index} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="w-full max-w-full min-w-0">
        <Panel>
          <div className="grid gap-2">
            <Skeleton className="h-7 w-44 rounded-lg" />
            <Skeleton className="h-4 w-56 max-w-full rounded-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg md:h-72" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </Panel>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <div className="grid gap-2.5">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </Panel>
        <Panel>
          <Skeleton className="h-7 w-52 rounded-lg" />
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-24 w-full rounded-lg" key={index} />
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid w-full max-w-full min-w-0 gap-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
