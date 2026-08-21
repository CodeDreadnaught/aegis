import type { Metadata } from "next";
import {
  Funnel,
  HardHat,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Equipment",
};

export default function EquipmentPage() {
  return (
    <ModuleOverview
      description="Register, search, view and maintain supported upstream equipment records."
      items={[
        { title: "Equipment register", description: "Generic Equipment records will support pumps, compressors, wellheads, separators, valves, pipelines, tanks and generators.", icon: HardHat },
        { title: "Create workflow", description: "Administrator-controlled registration will validate asset tags, category, location and manufacturer details.", icon: Plus },
        { title: "Search and filtering", description: "Equipment lists will support operational filtering without creating category-specific database tables.", icon: Funnel },
        { title: "Edit workflow", description: "Authorised updates will be persisted through Server Actions and audited.", icon: PencilSimple },
        { title: "Controlled deletion", description: "Deletion will protect prediction, maintenance and audit traceability rather than relying on careless cascades.", icon: Trash },
      ]}
      status="AE-05 has not started. This page exists as part of the shell/foundation route map and does not yet persist equipment records."
      title="Equipment"
    />
  );
}
