"use client";

import { useActionState } from "react";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";

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
        <Label
          className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          htmlFor="email"
        >
          Email address
        </Label>
        <div className="relative">
          <EnvelopeSimple
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            autoComplete="email"
            className="h-12 border-slate-200 bg-slate-50/80 pl-10 text-slate-950 shadow-inner focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            id="email"
            name="email"
            placeholder="name@company.com"
            type="email"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label
          className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          htmlFor="password"
        >
          Password
        </Label>
        <div className="relative">
          <LockKey
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            autoComplete="current-password"
            className="h-12 border-slate-200 bg-slate-50/80 pl-10 text-slate-950 shadow-inner focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            id="password"
            name="password"
            placeholder="Enter password"
            type="password"
          />
        </div>
      </div>
      {state.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button
        className="mt-2 h-12 justify-between bg-slate-950 px-4 text-white shadow-xl shadow-slate-950/18 hover:bg-emerald-800"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in" : "Sign in"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
