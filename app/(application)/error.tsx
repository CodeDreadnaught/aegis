"use client";

import { WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="premium-panel motion-card w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <WarningCircle className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Workflow could not be completed
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {error.message ||
            "The requested operation failed. Review the submitted data and try again."}
        </p>
        <Button className="mt-5" onClick={reset} type="button">
          Try again
        </Button>
      </div>
    </div>
  );
}
