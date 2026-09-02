import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      aria-label="Loading operational data"
      className="grid w-full max-w-full min-w-0 gap-4"
    >
      <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 gap-3">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-11 w-full max-w-xs rounded-lg" />
        </div>
      </section>

      <section className="grid w-full max-w-full min-w-0 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="grid gap-2 rounded-lg border border-zinc-200 p-3">
          <Skeleton className="h-8 w-full rounded-md" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-10 w-full rounded-md" key={index} />
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="grid gap-2">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="h-16 w-full rounded-lg" key={index} />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-full" />
      </Panel>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full max-w-full min-w-0">
      <div className="grid w-full max-w-full min-w-0 gap-4 rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm">
        {children}
      </div>
    </section>
  );
}
