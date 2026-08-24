"use client";

import { createScope, createTimeline, stagger } from "animejs";
import { useEffect, useRef, useState } from "react";

type PremiumMotionProps = {
  children: React.ReactNode;
  className?: string;
  profile?: "workspace" | "login" | "dashboard";
};

export function PremiumMotion({
  children,
  className,
  profile = "workspace",
}: PremiumMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (
      !root ||
      profile === "login" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const scope = createScope({ root }).add(() => {
      const timeline = createTimeline({
        defaults: {
          ease: "outExpo",
        },
      });

      if (root.querySelector("[data-motion='reveal']")) {
        timeline.add("[data-motion='reveal']", {
          opacity: [0, 1],
          translateY: [18, 0],
          duration: 720,
          delay: stagger(75),
        });
      }

      if (root.querySelector("[data-motion='panel']")) {
        timeline.add(
          "[data-motion='panel']",
          {
            opacity: [0, 1],
            translateY: [24, 0],
            scale: [0.985, 1],
            duration: 760,
            delay: stagger(85),
          },
          "-=520"
        );
      }

      if (root.querySelector("[data-motion='metric']")) {
        timeline.add(
          "[data-motion='metric']",
          {
            opacity: [0, 1],
            translateY: [20, 0],
            scale: [0.96, 1],
            duration: 640,
            delay: stagger(65),
          },
          "-=560"
        );
      }
    });

    return () => scope.revert();
  }, [profile]);

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
      ref={rootRef}
    >
      {children}
    </div>
  );
}
