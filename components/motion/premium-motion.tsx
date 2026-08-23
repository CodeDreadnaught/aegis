"use client";

import { createScope, createTimeline, stagger } from "animejs";
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const root = rootRef.current;

    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const scope = createScope({ root }).add(() => {
      const timeline = createTimeline({
        defaults: {
          ease: "outQuart",
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

      if (profile === "login" && root.querySelector("[data-motion='signal']")) {
        timeline.add(
          "[data-motion='signal']",
          {
            opacity: [0.25, 0.72],
            scaleX: [0.82, 1],
            duration: 900,
            delay: stagger(90),
          },
          "-=520"
        );
      }
    });

    return () => scope.revert();
  }, [profile]);

  return (
    <div className={className} data-motion-root={profile} ref={rootRef}>
      {children}
    </div>
  );
}
