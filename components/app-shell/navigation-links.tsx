"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getNavigationItems } from "@/components/app-shell/navigation";
import type { UserRole } from "@/generated/prisma/enums";

type NavigationLinksProps = {
  onNavigate?: () => void;
  role: UserRole;
};

export function NavigationLinks({ onNavigate, role }: NavigationLinksProps) {
  const pathname = usePathname();
  const navigationItems = getNavigationItems(role);

  return (
    <nav className="grid gap-1.5">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/72 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/8 hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/25"
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:scale-110"
              weight={isActive ? "fill" : "regular"}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
