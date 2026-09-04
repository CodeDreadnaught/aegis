"use client";

import { CheckCircle } from "@phosphor-icons/react";
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
    <form
      className="grid min-w-[34rem] grid-cols-[minmax(15rem,1fr)_minmax(10rem,0.7fr)_auto] items-center gap-2"
      onSubmit={handleSubmit}
    >
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
          className="h-10 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 text-zinc-950 [&>span]:truncate"
          size="sm"
        >
          <SelectValue>{userRoleLabels[role]}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[16rem]">
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
          className="h-10 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 text-zinc-950 [&>span]:truncate"
          size="sm"
        >
          <SelectValue>{userStatusLabels[status]}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[16rem]">
          {userStatusOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {userStatusLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        className="h-10 w-24 justify-center rounded-full border-[#009966] !bg-[#009966] px-4 !text-white shadow-sm hover:!bg-[#007a55] hover:!text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <CheckCircle />
        {pending ? "Saving" : "Save"}
      </Button>
    </form>
  );
}
