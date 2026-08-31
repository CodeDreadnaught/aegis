"use client";

import { useEffect } from "react";
import { Warning } from "@phosphor-icons/react";

import { BrandLogo } from "@/components/brand-logo";
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
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-10 text-zinc-950">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_26px_80px_rgba(9,9,11,0.10)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
          <BrandLogo className="mb-8 size-11 rounded-none shadow-none" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ef7b63]">
            Runtime fault
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            Error occurred
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-zinc-600">
            An error has occurred. Please try again later.
          </p>
          <div className="mt-8">
            <Button
              className="h-11 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white hover:bg-zinc-800"
              onClick={reset}
              type="button"
            >
              Try again
            </Button>
          </div>
        </div>

        <div className="relative grid min-h-[22rem] place-items-center overflow-hidden bg-[radial-gradient(circle_at_60%_45%,rgba(239,123,99,0.28),transparent_34%),linear-gradient(135deg,#09090b,#25100d_55%,#120907)] p-8">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#ef7b63]/20 to-transparent" />
          <div className="relative grid place-items-center">
            <div className="absolute size-56 rounded-full bg-[#ef7b63]/20 blur-3xl" />
            <div className="relative grid size-48 place-items-center rounded-[2rem] border-[10px] border-[#ff4b2f] bg-[#2b0d09] text-[#ffefe8] shadow-[0_0_38px_rgba(255,75,47,0.55)] [clip-path:polygon(50%_4%,96%_90%,4%_90%)] sm:size-60">
              <Warning className="mt-8 size-20 drop-shadow-[0_0_12px_rgba(255,255,255,0.55)]" weight="bold" />
              <span className="mb-6 text-3xl font-semibold tracking-[0.12em] text-[#ffdfd5] sm:text-4xl">
                ERROR
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
