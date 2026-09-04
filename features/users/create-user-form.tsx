"use client";

import { SpinnerGap, UserCirclePlus } from "@phosphor-icons/react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function CreateUserForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>("MAINTENANCE_ENGINEER");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
        formRef.current?.reset();
        setRole("MAINTENANCE_ENGINEER");
        setStatus("ACTIVE");
        toast.success({
          title: "User created",
          description: "The operator account is now available.",
        });
      } catch (error) {
        toast.error({
          title: "User was not created",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <form
      className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(11rem,0.8fr)_minmax(21rem,1.3fr)_minmax(13rem,0.9fr)_minmax(16rem,0.9fr)_minmax(9rem,0.6fr)] 2xl:items-end"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="role" type="hidden" value={role} />
      <input name="status" type="hidden" value={status} />

      <div className="min-w-0 space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          autoComplete="name"
          className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4"
          disabled={pending}
          id="name"
          name="name"
          placeholder="Nenkemun Goyit"
          required
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4"
          disabled={pending}
          id="email"
          name="email"
          placeholder="nenkemum.goyit@useaegisnow.com"
          required
          type="email"
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="password">Temporary password</Label>
        <Input
          autoComplete="new-password"
          className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4"
          disabled={pending}
          id="password"
          minLength={12}
          name="password"
          placeholder="Minimum 12 characters"
          required
          type="password"
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label>Role</Label>
        <Select
          disabled={pending}
          onValueChange={value => setRole(value as UserRole)}
          value={role}
        >
          <SelectTrigger className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 text-zinc-950 [&>span]:truncate">
            <SelectValue>{userRoleLabels[role]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-[16rem]">
            {userRoleOptions.map(option => (
              <SelectItem key={option} value={option}>
                {userRoleLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2">
        <Label>Status</Label>
        <Select
          disabled={pending}
          onValueChange={value => setStatus(value as UserStatus)}
          value={status}
        >
          <SelectTrigger className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 text-zinc-950 [&>span]:truncate">
            <SelectValue>{userStatusLabels[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-[16rem]">
            {userStatusOptions.map(option => (
              <SelectItem key={option} value={option}>
                {userStatusLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="h-11 w-full rounded-full border-[#009966] !bg-[#009966] text-white shadow-sm hover:!bg-[#007a55] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 2xl:col-span-5"
        disabled={pending}
        type="submit"
      >
        {pending ? <SpinnerGap className="animate-spin" /> : <UserCirclePlus />}
        {pending ? "Creating" : "Create user"}
      </Button>
    </form>
  );
}
