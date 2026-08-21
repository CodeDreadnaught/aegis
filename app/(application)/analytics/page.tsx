import type { Metadata } from "next";
import { Brain, ChartLineUp, ShieldWarning } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Predictive Analytics",
};

export default function AnalyticsPage() {
  return (
    <ModuleOverview
      description="Run server-side ONNX inference, calculate health score, classify risk and generate deterministic recommendations."
      items={[
        { title: "XGBoost inference", description: "The approved ONNX model will load server-side only after AE-08 model artefacts pass parity validation.", icon: Brain },
        { title: "Health score", description: "Health will be calculated as H = 100 x (1 - failure probability) with bounded values.", icon: ChartLineUp },
        { title: "Risk classification", description: "Low, Medium and High levels will use versioned thresholds, not scattered literals.", icon: ShieldWarning },
      ]}
      status="AE-08, AE-09 and AE-10 are pending. Predictive outputs are not yet generated."
      title="Predictive Analytics"
    />
  );
}
