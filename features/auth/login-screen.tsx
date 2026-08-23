import { LockKey, ShieldCheck } from "@phosphor-icons/react/ssr";

import { PremiumMotion } from "@/components/motion/premium-motion";
import { LoginForm } from "@/features/auth/login-form";

export function LoginScreen() {
  return (
    <PremiumMotion
      className="min-h-dvh overflow-hidden bg-[linear-gradient(135deg,oklch(0.12_0.018_248),oklch(0.16_0.026_236)_48%,oklch(0.18_0.036_166))] text-white"
      profile="login"
    >
      <main className="relative grid min-h-dvh place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(110,231,183,0.85),rgba(125,211,252,0.7),transparent)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-28 top-20 h-[34rem] w-[42rem] rotate-[-18deg] border border-white/8 bg-white/[0.035] shadow-2xl shadow-slate-950/40"
        />

        <section className="relative grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_27rem]">
          <div className="max-w-3xl" data-motion="reveal">
            <div className="mb-7 grid size-14 place-items-center rounded-md bg-emerald-300 text-slate-950 shadow-[0_18px_55px_rgba(52,211,153,0.28)]">
              <ShieldCheck aria-hidden="true" className="size-8" weight="fill" />
            </div>
            <h1 className="text-6xl font-semibold leading-none tracking-normal sm:text-7xl">
              AEGIS
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-medium leading-8 text-white/86 sm:text-2xl sm:leading-9">
              AI-driven equipment guardianship for upstream operations.
            </p>
          </div>

          <section
            className="rounded-lg border border-white/18 bg-white/[0.96] p-5 text-slate-950 shadow-2xl shadow-slate-950/35 backdrop-blur-xl sm:p-6"
            data-motion="panel"
          >
            <div className="mb-6">
              <div className="mb-4 grid size-11 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800">
                <LockKey aria-hidden="true" className="size-5" weight="fill" />
              </div>
              <h2 className="text-2xl font-semibold tracking-normal">
                Secure Access
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your authorised credentials to continue.
              </p>
            </div>
            <LoginForm />
          </section>
        </section>
      </main>
    </PremiumMotion>
  );
}
