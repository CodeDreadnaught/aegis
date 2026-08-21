"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navigationItems } from "@/components/app-shell/navigation";

type NavigationLinksProps = {
  onNavigate?: () => void;
};

export function NavigationLinks({ onNavigate }: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1.5">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={cn(
              "group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/78 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-cyan-950/20"
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
