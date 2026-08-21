import type { Metadata } from "next";
import {
  CalendarCheck,
  ClockCounterClockwise,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Maintenance",
};

export default function MaintenancePage() {
  return (
    <ModuleOverview
      description="Manage maintenance events, history, due dates and authorised maintenance updates."
      items={[
        { title: "Maintenance records", description: "Records will capture type, description, performed date, next due date and status.", icon: Wrench },
        { title: "History", description: "Equipment-specific history will be reachable from equipment details and maintenance views.", icon: ClockCounterClockwise },
        { title: "Planning", description: "Maintenance due information will feed dashboard and reporting summaries.", icon: CalendarCheck },
      ]}
      status="AE-07 is pending. Maintenance workflows are not persisted yet."
      title="Maintenance"
    />
  );
}
