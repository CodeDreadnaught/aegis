"use client";

import { CaretRight } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  alerts: "Alerts",
  analytics: "Predictive Analytics",
  audit: "Audit",
  dashboard: "Dashboard",
  equipment: "Equipment",
  maintenance: "Maintenance",
  "operational-data": "Operational Data",
  reports: "Reports",
  users: "Users",
};

export function TopBreadcrumb() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const label = routeLabels[segment] ?? "Operations Console";

  return (
    <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 sm:flex">
      <span>AEGIS</span>
      <CaretRight aria-hidden="true" className="size-3" />
      <span>{label}</span>
    </div>
  );
}
