"use client";

import { useEffect } from "react";
import { Warning } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center px-3 py-4 text-white lg:px-5">
      <section className="relative grid min-h-[30rem] w-full overflow-hidden rounded-[1.5rem] border border-zinc-900 bg-[#090b0c] shadow-[0_26px_80px_rgba(9,9,11,0.18)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(239,68,68,0.30),transparent_30%),linear-gradient(90deg,#050707_0%,#111312_42%,#2a110d_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/10 to-transparent" />

        <div className="relative z-10 flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl lg:text-6xl">
            Error occurred
          </h1>
          <p className="mt-6 max-w-sm text-base font-medium leading-7 text-zinc-200 sm:text-lg">
            An error has occurred. Please try again later.
          </p>
          <div className="mt-9">
            <Button
              className="h-12 rounded-lg bg-white px-7 text-sm font-semibold uppercase tracking-normal text-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.24)] hover:bg-zinc-100"
              onClick={reset}
              type="button"
            >
              Try again
            </Button>
          </div>
        </div>

        <div className="relative z-10 grid min-h-[22rem] place-items-center p-8 sm:p-12">
          <div className="absolute bottom-0 h-24 w-3/4 rounded-full bg-[#ef4444]/20 blur-3xl" />
          <div className="relative grid size-64 place-items-center sm:size-80">
            <div className="absolute size-full rounded-[2rem] bg-[#ef4444]/25 blur-2xl [clip-path:polygon(50%_4%,96%_90%,4%_90%)]" />
            <div className="relative grid size-full place-items-center rounded-[2rem] border-[12px] border-[#ff3b25] bg-[#2a0d08]/80 text-[#fff0e8] shadow-[0_0_22px_rgba(255,59,37,0.92),inset_0_0_22px_rgba(255,59,37,0.55)] [clip-path:polygon(50%_4%,96%_90%,4%_90%)]">
              <div className="mt-10 grid place-items-center gap-4">
                <Warning className="size-24 drop-shadow-[0_0_16px_rgba(255,255,255,0.55)]" weight="bold" />
                <span className="text-5xl font-semibold tracking-[0.08em] text-[#ffd8ce] drop-shadow-[0_0_12px_rgba(255,85,55,0.85)]">
                  ERROR
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
