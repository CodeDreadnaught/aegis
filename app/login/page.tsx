import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/ssr";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Login",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[linear-gradient(135deg,oklch(0.14_0.04_248),oklch(0.25_0.075_246))] px-4 py-10 text-white">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex animate-in fade-in-0 slide-in-from-left-3 flex-col justify-between gap-8 py-4 duration-700">
          <div>
            <div className="mb-6 grid size-14 place-items-center rounded-md bg-cyan-300 text-slate-950 shadow-2xl shadow-cyan-950/40">
              <ShieldCheck aria-hidden="true" className="size-8" weight="fill" />
            </div>
            <h1 className="text-4xl font-semibold tracking-normal">AEGIS</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-cyan-50/76">
              AI-Driven Equipment Guardian for Intelligent Surveillance.
              Intelligent predictive maintenance for upstream oil and gas equipment.
            </p>
          </div>
          <div className="rounded-md border border-white/14 bg-white/8 p-4 text-sm text-cyan-50/76 backdrop-blur">
            Authentication is in foundation state. Real login, sessions and
            RBAC will be implemented in AE-03.
          </div>
        </div>
        <Card className="animate-in fade-in-0 slide-in-from-right-3 border-white/20 bg-white/95 shadow-2xl shadow-slate-950/35 backdrop-blur duration-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LockKey aria-hidden="true" className="size-5 text-primary" />
              Secure Access
            </CardTitle>
            <CardDescription>
              Use authorised AEGIS credentials when authentication is enabled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
