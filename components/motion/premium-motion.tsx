"use client";

import { useEffect, useState } from "react";

type PremiumMotionProps = {
  children: React.ReactNode;
  className?: string;
  profile?: "workspace" | "login" | "overview";
};

export function PremiumMotion({
  children,
  className,
  profile = "workspace",
}: PremiumMotionProps) {
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {

    if (profile !== "login") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        setMotionReady(true);
      }, 120);
    });

    return () => {
      window.cancelAnimationFrame(frame);

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [profile]);

  return (
    <div
      className={className}
      data-motion-ready={
        profile === "login" && motionReady ? "true" : undefined
      }
      data-motion-root={profile}
    >
      {children}
    </div>
  );
}
