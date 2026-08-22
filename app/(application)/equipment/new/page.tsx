import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { createEquipmentAction } from "@/features/equipment/actions";
import { EquipmentForm } from "@/features/equipment/equipment-form";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Register Equipment",
};

export default async function NewEquipmentPage() {
  await requirePermission("createEquipment");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Create a generic equipment record that can later receive readings, maintenance history and predictive risk outputs."
        eyebrow="Equipment"
        title="Register Equipment"
      />
      <EquipmentForm
        action={createEquipmentAction}
        submitLabel="Create equipment"
      />
    </div>
  );
}
