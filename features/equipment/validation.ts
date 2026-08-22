import { z } from "zod";

export const equipmentCategories = [
  "PUMP",
  "COMPRESSOR",
  "WELLHEAD",
  "CHRISTMAS_TREE",
  "SEPARATOR",
  "HEAT_EXCHANGER",
  "PRODUCTION_VALVE",
  "PIPELINE",
  "STORAGE_TANK",
  "GENERATOR",
] as const;

export const equipmentStatuses = [
  "ACTIVE",
  "MAINTENANCE",
  "INACTIVE",
  "DECOMMISSIONED",
] as const;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value?.length ? value : undefined));

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.date().optional()
);

export const equipmentSchema = z.object({
  assetTag: z.string().trim().min(2, "Asset tag is required.").max(80),
  name: z.string().trim().min(2, "Equipment name is required.").max(120),
  category: z.enum(equipmentCategories),
  status: z.enum(equipmentStatuses).default("ACTIVE"),
  location: z.string().trim().min(2, "Location is required.").max(160),
  manufacturer: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  installationDate: optionalDate,
  description: optionalText,
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;

export function formatEquipmentCategory(category: string) {
  return category
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}
