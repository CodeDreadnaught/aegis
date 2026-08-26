"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ranges = [
  { label: "Live", value: "1" },
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
] as const;

type OverviewControlsProps = {
  activeRange: string;
};

export function OverviewControls({ activeRange }: OverviewControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [lastSync, setLastSync] = useState("Live");

  useEffect(() => {
    const onSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ syncedAt?: string }>).detail;

      if (detail?.syncedAt) {
        setLastSync(detail.syncedAt);
      }
    };

    window.addEventListener("aegis:overview-synced", onSynced);

    return () => window.removeEventListener("aegis:overview-synced", onSynced);
  }, []);

  const setRange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
        {ranges.map((range) => (
          <button
            className={cn(
              "h-9 rounded-full px-4 text-sm font-semibold text-zinc-500 transition-all duration-200 hover:text-zinc-950",
              activeRange === range.value &&
                "bg-zinc-950 text-white shadow-[0_10px_26px_rgba(24,24,27,0.18)] hover:text-white"
            )}
            key={range.value}
            onClick={() => setRange(range.value)}
            type="button"
          >
            {range.label}
          </button>
        ))}
      </div>
      <Button
        className="h-11 rounded-full border-zinc-200 bg-white px-4 text-zinc-950 hover:bg-zinc-950 hover:text-white"
        disabled={isPending}
        onClick={() => {
          setIsManualRefresh(true);
          window.dispatchEvent(new CustomEvent("aegis:overview-refresh"));
          window.setTimeout(() => setIsManualRefresh(false), 700);
        }}
        type="button"
        variant="outline"
      >
        <ArrowsClockwise
          aria-hidden="true"
          className={cn("size-4", isManualRefresh && "animate-spin")}
        />
        Refresh
      </Button>
      {lastSync && (
        <span className="text-xs font-medium text-zinc-500">
          Synced {lastSync}
        </span>
      )}
    </div>
  );
}
