"use client";

import { useActionState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

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
  const labelClassName = isDark
    ? "text-xs font-semibold uppercase tracking-widest text-zinc-400"
    : "text-sm font-medium text-zinc-800";
  const inputClassName = isDark
    ? "h-12 rounded-full border-zinc-800 bg-zinc-900/72 px-5 text-zinc-50 placeholder:text-zinc-500 focus-visible:border-zinc-200 focus-visible:ring-zinc-200/18"
    : "h-12 rounded-full border-zinc-200 bg-zinc-50 px-5 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-950 focus-visible:ring-zinc-950/12";

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label className={labelClassName} htmlFor="email">
          Email address
        </Label>
        <Input
          autoComplete="email"
          className={inputClassName}
          id="email"
          name="email"
          placeholder="yourname@mail.com"
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <Label className={labelClassName} htmlFor="password">
          Password
        </Label>
        <Input
          autoComplete="current-password"
          className={inputClassName}
          id="password"
          name="password"
          placeholder="********"
          type="password"
        />
      </div>
      {state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button
        className={
          isDark
            ? "mt-2 h-12 justify-center rounded-full bg-zinc-50 px-5 text-zinc-950 hover:bg-zinc-200"
            : "mt-2 h-12 justify-center gap-2 rounded-full bg-zinc-950 px-5 text-white shadow-none hover:bg-zinc-800"
        }
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in" : "Login"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
