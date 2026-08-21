import type { Metadata } from "next";
import { Bell, CheckCircle, Warning } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Alerts",
};

export default function AlertsPage() {
  return (
    <ModuleOverview
      description="Track active, acknowledged and resolved maintenance alerts with equipment and prediction traceability."
      items={[
        { title: "Alert generation", description: "Alerts will be created from qualifying prediction and rule conditions.", icon: Bell },
        { title: "Severity", description: "Severity will be displayed with textual labels so colour is not the only signal.", icon: Warning },
        { title: "Resolution workflow", description: "Authorised users will acknowledge and resolve alerts through Server Actions.", icon: CheckCircle },
      ]}
      status="AE-12 is pending. Alerts are not stored yet."
      title="Alerts"
    />
  );
}
