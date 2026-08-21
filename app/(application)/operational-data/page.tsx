import type { Metadata } from "next";
import { Database, Gauge, SlidersHorizontal } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Operational Data",
};

export default function OperationalDataPage() {
  return (
    <ModuleOverview
      description="Record equipment-associated operational readings and distinguish model inputs from contextual parameters."
      items={[
        { title: "Reading capture", description: "Operational readings will belong to one Equipment record and include timestamp, source type and creator.", icon: Database },
        { title: "Model feature inputs", description: "Only trained AI4I feature-schema fields will be presented as XGBoost predictors.", icon: Gauge },
        { title: "Contextual parameters", description: "Pressure, vibration, flow and operating hours may support display and rules without false model-feature claims.", icon: SlidersHorizontal },
      ]}
      status="AE-06 is pending. No operational readings are stored yet."
      title="Operational Data"
    />
  );
}
