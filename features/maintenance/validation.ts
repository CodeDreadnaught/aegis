import { MaintenanceStatus } from "@/generated/prisma/enums";
import { z } from "zod";

export const maintenanceStatuses = [
  MaintenanceStatus.PLANNED,
  MaintenanceStatus.IN_PROGRESS,
  MaintenanceStatus.COMPLETED,
  MaintenanceStatus.DEFERRED,
] as const;

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.date().optional()
);

export const maintenanceRecordSchema = z.object({
  equipmentId: z.string().trim().min(1, "Equipment is required."),
  type: z.string().trim().min(2, "Maintenance type is required.").max(120),
  description: z.string().trim().min(5, "Description is required.").max(2000),
  performedAt: z.coerce.date(),
  nextDueDate: optionalDate,
  status: z.enum(maintenanceStatuses).default(MaintenanceStatus.COMPLETED),
});

export type MaintenanceRecordInput = z.infer<typeof maintenanceRecordSchema>;

export function formatMaintenanceStatus(status: string) {
  return status
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

export function isOverdue(nextDueDate: Date | null | undefined, now = new Date()) {
  return Boolean(nextDueDate && nextDueDate < now);
}
