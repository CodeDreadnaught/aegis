"use client";

import { useActionState } from "react";
import { LockKey } from "@phosphor-icons/react";

import { loginAction, type LoginActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="admin@aegis.demo"
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          placeholder="Password"
          type="password"
        />
      </div>
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button className="mt-2" disabled={pending} type="submit">
        <LockKey aria-hidden="true" className="size-4" />
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
