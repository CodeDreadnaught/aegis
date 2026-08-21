import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  ChartLineUp,
  ClipboardText,
  Database,
  Gauge,
  HardHat,
  Pulse,
  ShieldCheck,
  Users,
  Wrench,
} from "@phosphor-icons/react/ssr";

export type NavigationItem = {
  href: string;
  label: string;
  icon: Icon;
};

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/equipment", label: "Equipment", icon: HardHat },
  { href: "/operational-data", label: "Operational Data", icon: Database },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/analytics", label: "Predictive Analytics", icon: ChartLineUp },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/reports", label: "Reports", icon: ClipboardText },
  { href: "/users", label: "Users", icon: Users },
  { href: "/audit", label: "Audit", icon: Pulse },
  { href: "/login", label: "Login", icon: ShieldCheck },
];
