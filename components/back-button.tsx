"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type BackButtonProps = {
  className?: string;
};

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950",
        className
      )}
      onClick={() => router.back()}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back
    </button>
  );
}
