import { z } from "zod";

import { UserRole, UserStatus } from "@/generated/prisma/enums";

export const userRoleOptions = [
  UserRole.ADMINISTRATOR,
  UserRole.MAINTENANCE_ENGINEER,
  UserRole.OPERATIONS_MANAGER,
] as const;

export const userStatusOptions = [
  UserStatus.ACTIVE,
  UserStatus.DISABLED,
] as const;

export const userRoleLabels: Record<(typeof userRoleOptions)[number], string> = {
  ADMINISTRATOR: "Administrator",
  MAINTENANCE_ENGINEER: "Maintenance Engineer",
  OPERATIONS_MANAGER: "Operations Manager",
};

export const userStatusLabels: Record<
  (typeof userStatusOptions)[number],
  string
> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(120, "Name must contain 120 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(12, "Password must contain at least 12 characters.")
    .max(128, "Password must contain 128 characters or fewer."),
  role: z.enum(userRoleOptions),
  status: z.enum(userStatusOptions),
});

export const updateUserAccessSchema = z.object({
  userId: z.string().trim().min(1, "A user is required."),
  role: z.enum(userRoleOptions),
  status: z.enum(userStatusOptions),
});

export const deleteUserSchema = z.object({
  userId: z.string().trim().min(1, "A user is required."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export function parseCreateUserFormData(formData: FormData) {
  return createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    status: formData.get("status"),
  });
}

export function parseUpdateUserAccessFormData(formData: FormData) {
  return updateUserAccessSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    status: formData.get("status"),
  });
}

export function parseDeleteUserFormData(formData: FormData) {
  return deleteUserSchema.safeParse({
    userId: formData.get("userId"),
  });
}

export function userInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function isRemovingActiveAdministrator(
  currentRole: CreateUserInput["role"],
  currentStatus: CreateUserInput["status"],
  nextRole: CreateUserInput["role"],
  nextStatus: CreateUserInput["status"]
) {
  return (
    currentRole === UserRole.ADMINISTRATOR &&
    currentStatus === UserStatus.ACTIVE &&
    (nextRole !== UserRole.ADMINISTRATOR || nextStatus !== UserStatus.ACTIVE)
  );
}
