"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

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
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [status, setStatus] = useState<UserStatus>(initialStatus);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
        toast.success({
          title: "Access updated",
          description: "The user permissions were saved.",
        });
      } catch (error) {
        toast.error({
          title: "Access was not updated",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <form className="ml-auto grid max-w-md gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
      <input name="userId" type="hidden" value={userId} />
      <input name="role" type="hidden" value={role} />
      <input name="status" type="hidden" value={status} />

      <Select
        disabled={pending}
        value={role}
        onValueChange={(value) => setRole(value as UserRole)}
      >
        <SelectTrigger
          aria-label="Role"
          className="w-full rounded-full border-zinc-200 bg-zinc-50"
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
        disabled={pending}
        value={status}
        onValueChange={(value) => setStatus(value as UserStatus)}
      >
        <SelectTrigger
          aria-label="Status"
          className="w-full rounded-full border-zinc-200 bg-zinc-50"
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

      <Button
        className="rounded-full border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
        variant="outline"
      >
        {pending ? "Saving" : "Save"}
      </Button>
    </form>
  );
}
