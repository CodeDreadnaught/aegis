"use client";

import { usePathname } from "next/navigation";

import {
  getNavigationItems,
  getNavigationLabel,
} from "@/components/app-shell/navigation";
import type { UserRole } from "@/generated/prisma/enums";

type TopNavigationProps = {
  role: UserRole;
};

export function TopNavigation({ role }: TopNavigationProps) {
  const pathname = usePathname();
  const activeItem = getNavigationItems(role).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const label = activeItem ? getNavigationLabel(activeItem) : "Dashboard";

  return (
    <div className="hidden min-w-[14rem] justify-center xl:flex">
      <span className="text-sm font-semibold text-zinc-950">{label}</span>
    </div>
  );
}
