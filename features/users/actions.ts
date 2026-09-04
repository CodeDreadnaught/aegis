"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

import { UserRole, UserStatus } from "@/generated/prisma/enums";
import {
  isRemovingActiveAdministrator,
  parseCreateUserFormData,
  parseDeleteUserFormData,
  parseUpdateUserAccessFormData,
} from "@/features/users/validation";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

const usersPath = "/users";

function firstValidationError(error: {
  issues: Array<{ message: string }>;
}) {
  return error.issues[0]?.message ?? "Check the submitted user details.";
}

export async function createUserAction(
  formData: FormData
): Promise<void> {
  const actor = await requirePermission("manageUsers");
  const parsed = parseCreateUserFormData(formData);

  if (!parsed.success) {
    throw new Error(firstValidationError(parsed.error));
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      status: parsed.data.status,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      metadata: {
        role: user.role,
        status: user.status,
      },
    },
  });

  revalidatePath(usersPath);
}

export async function updateUserAccessAction(
  formData: FormData
): Promise<void> {
  const actor = await requirePermission("manageUsers");
  const parsed = parseUpdateUserAccessFormData(formData);

  if (!parsed.success) {
    throw new Error(firstValidationError(parsed.error));
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!target) {
    throw new Error("User account was not found.");
  }

  if (
    isRemovingActiveAdministrator(
      target.role,
      target.status,
      parsed.data.role,
      parsed.data.status
    )
  ) {
    const activeAdministratorCount = await prisma.user.count({
      where: {
        role: UserRole.ADMINISTRATOR,
        status: UserStatus.ACTIVE,
      },
    });

    if (activeAdministratorCount <= 1) {
      throw new Error(
        "At least one active administrator must remain available for AEGIS."
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: target.id },
    data: {
      role: parsed.data.role,
      status: parsed.data.status,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "UPDATE_USER_ACCESS",
      entityType: "User",
      entityId: updatedUser.id,
      metadata: {
        previousRole: target.role,
        previousStatus: target.status,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    },
  });

  revalidatePath(usersPath);
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("manageUsers");
  const parsed = parseDeleteUserFormData(formData);

  if (!parsed.success) {
    throw new Error(firstValidationError(parsed.error));
  }

  if (parsed.data.userId === actor.id) {
    throw new Error("You cannot delete your own administrator account.");
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!target) {
    throw new Error("User account was not found.");
  }

  if (target.role === UserRole.ADMINISTRATOR && target.status === UserStatus.ACTIVE) {
    const activeAdministratorCount = await prisma.user.count({
      where: {
        role: UserRole.ADMINISTRATOR,
        status: UserStatus.ACTIVE,
      },
    });

    if (activeAdministratorCount <= 1) {
      throw new Error(
        "At least one active administrator must remain available for AEGIS."
      );
    }
  }

  await prisma.$transaction([
    prisma.session.deleteMany({
      where: { userId: target.id },
    }),
    prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "DELETE_USER",
        entityType: "User",
        entityId: target.id,
        metadata: {
          email: target.email,
          role: target.role,
          status: target.status,
        },
      },
    }),
    prisma.user.delete({
      where: { id: target.id },
    }),
  ]);

  revalidatePath(usersPath);
}
