"use client";

import { useActionState } from "react";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";

import { loginAction, type LoginActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginActionState = {};

type LoginFormProps = {
  surface?: "dark" | "light";
};

export function LoginForm({ surface = "light" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const isDark = surface === "dark";

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label
          className={
            isDark
              ? "text-xs font-semibold uppercase tracking-widest text-zinc-400"
              : "text-xs font-semibold uppercase tracking-widest text-slate-500"
          }
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
            className={
              isDark
                ? "h-12 border-zinc-800 bg-zinc-950/70 pl-10 text-zinc-50 placeholder:text-zinc-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                : "h-12 border-slate-200 bg-slate-50/80 pl-10 text-slate-950 shadow-inner focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            }
            id="email"
            name="email"
            placeholder="name@company.com"
            type="email"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label
          className={
            isDark
              ? "text-xs font-semibold uppercase tracking-widest text-zinc-400"
              : "text-xs font-semibold uppercase tracking-widest text-slate-500"
          }
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
            className={
              isDark
                ? "h-12 border-zinc-800 bg-zinc-950/70 pl-10 text-zinc-50 placeholder:text-zinc-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                : "h-12 border-slate-200 bg-slate-50/80 pl-10 text-slate-950 shadow-inner focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            }
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
        className={
          isDark
            ? "mt-2 h-12 justify-between bg-emerald-500/10 px-4 text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-emerald-500/20"
            : "mt-2 h-12 justify-between bg-slate-950 px-4 text-white shadow-xl shadow-slate-950/18 hover:bg-emerald-800"
        }
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in" : "Sign in"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
