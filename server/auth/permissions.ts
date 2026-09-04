import type { UserRole } from "@/generated/prisma/enums";

export type Permission =
  | "manageUsers"
  | "createEquipment"
  | "updateEquipment"
  | "deleteEquipment"
  | "viewEquipment"
  | "recordOperationalData"
  | "viewMaintenance"
  | "recordMaintenance"
  | "runPrediction"
  | "manageAlerts"
  | "viewReports"
  | "viewAudit";

export const permissions: Record<Permission, readonly UserRole[]> = {
  manageUsers: ["ADMINISTRATOR"],
  createEquipment: ["ADMINISTRATOR"],
  updateEquipment: ["ADMINISTRATOR"],
  deleteEquipment: ["ADMINISTRATOR"],
  viewEquipment: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER", "OPERATIONS_MANAGER"],
  recordOperationalData: [
    "ADMINISTRATOR",
    "MAINTENANCE_ENGINEER",
    "OPERATIONS_MANAGER",
  ],
  viewMaintenance: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER", "OPERATIONS_MANAGER"],
  recordMaintenance: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER"],
  runPrediction: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER", "OPERATIONS_MANAGER"],
  manageAlerts: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER"],
  viewReports: ["ADMINISTRATOR", "MAINTENANCE_ENGINEER", "OPERATIONS_MANAGER"],
  viewAudit: ["ADMINISTRATOR"],
};

export function can(role: UserRole, permission: Permission) {
  return permissions[permission].includes(role);
}

export function assertPermission(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("You are not authorised to perform this action.");
  }
}
