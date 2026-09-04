"use client";

import type { EquipmentCategory } from "@/generated/prisma/enums";

import { ReadingForm } from "@/features/operational-readings/reading-form";

type EquipmentOption = {
  id: string;
  assetTag: string;
  category: EquipmentCategory;
  name: string;
};

type CaptureWorkspaceProps = {
  action: (formData: FormData) => Promise<{ count: number } | void>;
  equipment: EquipmentOption[];
};

export function CaptureWorkspace({ action, equipment }: CaptureWorkspaceProps) {
  return <ReadingForm action={action} equipment={equipment} />;
}
