import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  ChartLineUp,
  ClipboardText,
  Database,
  Gauge,
  HardHat,
  Pulse,
  Users,
  Wrench,
} from "@phosphor-icons/react/ssr";
import type { UserRole } from "@/generated/prisma/enums";

export type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
  roles: readonly UserRole[];
};

const allRoles = [
  "ADMINISTRATOR",
  "MAINTENANCE_ENGINEER",
  "OPERATIONS_MANAGER",
] as const;

export const navigationItems: NavigationItem[] = [
  { href: "/overview", label: "Overview", icon: Gauge, roles: allRoles },
  { href: "/equipment", label: "Equipment", icon: HardHat, roles: allRoles },
  { href: "/operational-data", label: "Operational Data", icon: Database, roles: allRoles },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: allRoles },
  { href: "/analytics", label: "Predictive Analytics", icon: ChartLineUp, roles: allRoles },
  {
    href: "/alerts",
    label: "Alerts",
    icon: Bell,
    roles: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER"],
  },
  { href: "/reports", label: "Reports", icon: ClipboardText, roles: allRoles },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMINISTRATOR"] },
  { href: "/audit", label: "Audit", icon: Pulse, roles: ["ADMINISTRATOR"] },
];

export function getNavigationItems(role: UserRole) {
  return navigationItems.filter((item) => item.roles.includes(role));
}
