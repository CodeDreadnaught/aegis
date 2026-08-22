"use client";

import { useState } from "react";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  userRoleLabels,
  userRoleOptions,
  userStatusLabels,
  userStatusOptions,
} from "@/features/users/validation";

export function UserAccessForm({
  action,
  role: initialRole,
  status: initialStatus,
  userId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  role: UserRole;
  status: UserStatus;
  userId: string;
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [status, setStatus] = useState<UserStatus>(initialStatus);

  return (
    <form
      action={action}
      className="ml-auto grid max-w-md gap-2 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input name="userId" type="hidden" value={userId} />
      <input name="role" type="hidden" value={role} />
      <input name="status" type="hidden" value={status} />

      <Select
        value={role}
        onValueChange={(value) => setRole(value as UserRole)}
      >
        <SelectTrigger
          aria-label="Role"
          className="w-full bg-background"
          size="sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {userRoleOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {userRoleLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(value) => setStatus(value as UserStatus)}
      >
        <SelectTrigger
          aria-label="Status"
          className="w-full bg-background"
          size="sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {userStatusOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {userStatusLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" variant="outline">
        Save
      </Button>
    </form>
  );
}
