"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";

import { loginAction, type LoginActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

const initialState: LoginActionState = {};

type LoginFormProps = {
  surface?: "dark" | "light";
};

export function LoginForm({ surface = "light" }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState(state.fields?.email ?? "");
  const [password, setPassword] = useState(state.fields?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const isDark = surface === "dark";
  const labelClassName = isDark
    ? "text-xs font-semibold uppercase tracking-widest text-zinc-400"
    : "text-sm font-medium text-zinc-800";
  const inputClassName = isDark
    ? "h-12 rounded-full border-zinc-800 bg-zinc-900/72 px-5 text-zinc-50 placeholder:text-zinc-500 focus-visible:border-zinc-200 focus-visible:ring-zinc-200/18"
    : "h-12 rounded-full border-zinc-200 bg-zinc-50 px-5 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-950 focus-visible:ring-zinc-950/12";
  const canSubmit = email.trim().length > 0 && password.length > 0;

  const syncFieldsFromForm = (form = formRef.current) => {
    if (!form) {
      return;
    }

    const formData = new FormData(form);
    setEmail(String(formData.get("email") ?? ""));
    setPassword(String(formData.get("password") ?? ""));
  };

  useEffect(() => {
    if (!state.error) {
      return;
    }

    submittingRef.current = false;
    toast.error({
      id: "login-error",
      title: "Sign in failed",
      description: state.error,
    });
  }, [state]);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const sync = () => syncFieldsFromForm(form);

    sync();
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);

    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, []);

  return (
    <form
      action={formAction}
      className="grid gap-4"
      onInput={(event) => syncFieldsFromForm(event.currentTarget)}
      onSubmit={(event) => {
        if (submittingRef.current || !canSubmit) {
          event.preventDefault();
          return;
        }

        submittingRef.current = true;
      }}
    >
      <div className="grid gap-2" data-motion="login-email-field">
        <Label className={labelClassName} htmlFor="email">
          Email address
        </Label>
        <Input
          autoComplete="email"
          className={inputClassName}
          id="email"
          name="email"
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-2" data-motion="login-password-field">
        <Label className={labelClassName} htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className={`${inputClassName} pr-12`}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={
              isDark
                ? "absolute right-4 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/30"
                : "absolute right-4 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            }
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <EyeSlash aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>
      <Button
        className={
          isDark
            ? "mt-2 h-12 justify-center rounded-full bg-zinc-50 px-5 text-zinc-950 hover:bg-zinc-200"
            : "mt-2 h-12 justify-center gap-2 rounded-full bg-zinc-950 px-5 text-white shadow-none hover:bg-zinc-800"
        }
        data-motion="login-submit"
        disabled={pending || !canSubmit}
        type="submit"
      >
        {pending ? "Signing in" : "Login"}
        {pending ? (
          <SpinnerGap aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" className="size-4" />
        )}
      </Button>
    </form>
  );
}
