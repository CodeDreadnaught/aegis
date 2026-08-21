import type { Metadata } from "next";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "AEGIS - Login",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,oklch(0.74_0.12_195),transparent_26rem),linear-gradient(135deg,oklch(0.16_0.042_248),oklch(0.25_0.075_246))] px-4 py-10 text-white">
      <section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between gap-8 py-4">
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
        <Card className="border-white/16 bg-white/94 shadow-2xl shadow-slate-950/30">
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
            <form className="grid gap-4">
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
              <Button className="mt-2" disabled type="button">
                Sign in pending AE-03
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
