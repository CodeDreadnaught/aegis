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
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center px-3 py-4  lg:px-5">
      <section className="relative grid w-full overflow-hidden  lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center items-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            Oops!
          </h1>
          <p className="mt-2 lg:mt-6 max-w-sm text-base font-medium leading-7 sm:text-lg">
            We encoutered a problem.
          </p>
          <div className="mt-4 lg:mt-6">
            <Button
              className="h-12 rounded-lg bg-emerald-600 px-7 text-sm font-semibold uppercase tracking-normal text-white hover:bg-emerald-700"
              onClick={reset}
              type="button"
            >
              Try again
            </Button>
          </div>
        </div>

        <div className="relative z-10 grid place-items-center order-[-1] lg:order-1">
          <div className="relative grid place-items-center">
            <div className="grid animate-pulse place-items-center gap-4 text-red-700">
              <Warning className="size-32 lg:-mt-3" weight="bold" />
              <span className="hidden lg:inline  text-5xl font-semibold tracking-[0.08em]">
                ERROR
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
