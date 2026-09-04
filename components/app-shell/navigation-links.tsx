"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationItems } from "@/components/app-shell/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type NavigationLinksProps = {
  compact?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  role: UserRole;
  section?: "all" | "admin" | "primary" | "secondary";
};

const primaryRoutes = [
  "/overview",
  "/equipment",
  "/operational-data",
  "/maintenance",
  "/analytics",
];
const secondaryRoutes = ["/alerts", "/reports"];
const adminRoutes = ["/users", "/audit"];

export function NavigationLinks({
  compact = false,
  mobile = false,
  onNavigate,
  role,
  section = "all",
}: NavigationLinksProps) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems(role).filter((item) => {
    if (section === "all") return true;
    if (section === "primary") return primaryRoutes.includes(item.href);
    if (section === "secondary") return secondaryRoutes.includes(item.href);
    return adminRoutes.includes(item.href);
  });

  return (
    <nav
      className={cn(
        "grid gap-1",
        compact && "justify-items-center",
        mobile && "gap-2"
      )}
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        const link = (
          <Link
            className={cn(
              "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-zinc-50 hover:text-zinc-950",
              isActive &&
                "bg-zinc-950 text-white shadow-[0_12px_30px_rgba(24,24,27,0.18)]",
              mobile &&
                "min-h-12 rounded-full border border-transparent bg-white px-2.5 pr-4 text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950",
              mobile &&
                isActive &&
                "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-50 hover:text-emerald-700",
              compact &&
                "size-10 justify-center rounded-full px-0 hover:bg-zinc-100",
              compact &&
                isActive &&
                "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
            )}
            href={item.href}
            onClick={onNavigate}
          >
            {isActive && !compact && !mobile ? (
              <span
                aria-hidden="true"
                className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white/70"
              />
            ) : null}
            {mobile ? (
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full bg-zinc-50 text-zinc-500 transition-colors group-hover:bg-white group-hover:text-zinc-950",
                  isActive &&
                    "bg-emerald-600 text-white group-hover:bg-emerald-600 group-hover:text-white"
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:scale-110"
                  weight={isActive ? "fill" : "regular"}
                />
              </span>
            ) : (
              <Icon
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
                weight={isActive ? "fill" : "regular"}
              />
            )}
            <span className={cn(compact && "sr-only")}>{item.label}</span>
          </Link>
        );

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side={compact ? "right" : "top"}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
