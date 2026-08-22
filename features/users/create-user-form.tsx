"use client";

import { UserCirclePlus } from "@phosphor-icons/react";
import { useState } from "react";
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

export function CreateUserForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>("MAINTENANCE_ENGINEER");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");

  return (
    <form action={action} className="space-y-4">
      <input name="role" type="hidden" value={role} />
      <input name="status" type="hidden" value={status} />

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          autoComplete="name"
          id="name"
          name="name"
          placeholder="Ada Okoro"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="ada.okoro@aegis.demo"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Temporary password</Label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={12}
          name="password"
          placeholder="Minimum 12 characters"
          required
          type="password"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as UserRole)}
          >
            <SelectTrigger className="w-full bg-background">
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
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as UserStatus)}
          >
            <SelectTrigger className="w-full bg-background">
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
        </div>
      </div>
      <Button className="w-full" type="submit">
        <UserCirclePlus />
        Create user
      </Button>
    </form>
  );
}
