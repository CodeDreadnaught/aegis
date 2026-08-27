"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockSimple } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { getNavigationItems } from "@/components/app-shell/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/generated/prisma/enums";

type NavigationLinksProps = {
  compact?: boolean;
  onNavigate?: () => void;
  role: UserRole;
};

export function NavigationLinks({
  compact = false,
  onNavigate,
  role,
}: NavigationLinksProps) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems(role);

  return (
    <nav className={cn("grid gap-1", compact && "justify-items-center")}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isAvailable = item.available;
        const isActive =
          isAvailable &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));

        const linkContent = (
          <>
            {isActive && !compact && (
              <span
                aria-hidden="true"
                className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white/70"
              />
            )}
            <Icon
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
              weight={isActive ? "fill" : "regular"}
            />
            <span className={cn(compact && "sr-only")}>{item.label}</span>
            {!isAvailable && !compact && (
              <LockSimple aria-hidden="true" className="ml-auto size-3.5" />
            )}
          </>
        );

        const link = isAvailable ? (
          <Link
            className={cn(
              "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-950",
              isActive &&
                "bg-zinc-950 text-white shadow-[0_12px_30px_rgba(24,24,27,0.18)]",
              compact &&
                "size-10 justify-center rounded-full px-0 hover:bg-zinc-100",
              compact && isActive && "bg-[#2f9da7] text-white"
            )}
            href={item.href}
            onClick={onNavigate}
          >
            {linkContent}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              "group relative flex min-h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-300",
              compact && "size-10 justify-center rounded-full px-0"
            )}
          >
            {linkContent}
          </span>
        );

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side={compact ? "right" : "top"}>
              {isAvailable ? item.label : `${item.label} - Administrator only`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
