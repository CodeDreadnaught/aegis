import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { updateEquipmentAction } from "@/features/equipment/actions";
import { EquipmentForm } from "@/features/equipment/equipment-form";
import { getEquipmentDetails } from "@/features/equipment/queries";
import { requirePermission } from "@/server/auth/session";

type EditEquipmentPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "AEGIS - Edit Equipment",
};

export default async function EditEquipmentPage({
  params,
}: EditEquipmentPageProps) {
  await requirePermission("updateEquipment");
  const { id } = await params;
  const equipment = await getEquipmentDetails(id);

  if (!equipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Update equipment metadata while preserving linked readings, maintenance records and prediction history."
        eyebrow={equipment.assetTag}
        title="Edit Equipment"
      />
      <EquipmentForm
        action={updateEquipmentAction.bind(null, equipment.id)}
        equipment={equipment}
        submitLabel="Save changes"
      />
    </div>
  );
}
