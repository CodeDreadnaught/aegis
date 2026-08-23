import { LockKey } from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { BrandLogo } from "@/components/brand-logo";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { LoginForm } from "@/features/auth/login-form";

export function LoginScreen() {
  return (
    <PremiumMotion
      className="min-h-dvh overflow-hidden bg-[linear-gradient(135deg,oklch(0.1_0.018_248),oklch(0.15_0.026_232)_46%,oklch(0.17_0.038_166))] text-white"
      profile="login"
    >
      <main className="relative grid min-h-dvh place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <Image
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-72"
          fill
          priority
          quality={90}
          src="/login-aegis-ai-industrial.png"
          sizes="100vw"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.62),rgba(2,6,23,0.3)_45%,rgba(2,6,23,0.48)),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.7))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-28 [background-image:linear-gradient(115deg,transparent_0_18%,rgba(125,211,252,0.08)_18%_18.2%,transparent_18.2%_39%,rgba(110,231,183,0.09)_39%_39.2%,transparent_39.2%_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute left-[8%] top-[13%] hidden h-72 w-[34rem] rounded-lg border border-emerald-200/12 bg-slate-950/18 shadow-2xl shadow-slate-950/30 backdrop-blur-[2px] lg:block"
        >
          <div className="absolute left-8 top-10 h-px w-64 bg-emerald-200/35" />
          <div className="absolute left-8 top-10 h-28 w-px bg-emerald-200/35" />
          <div className="absolute left-8 top-[9.5rem] h-px w-40 bg-sky-200/30" />
          <div className="absolute left-48 top-[9.5rem] h-20 w-px bg-sky-200/30" />
          <div className="absolute left-48 top-[14.5rem] h-px w-44 bg-emerald-200/30" />
          <div className="absolute right-10 top-10 h-36 w-36 rounded-md border border-white/10 bg-white/[0.035]" />
          <div className="absolute right-20 top-20 h-16 w-16 rounded-md border border-emerald-200/20 bg-emerald-200/5" />
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-[10%] right-[7%] hidden h-56 w-[30rem] -skew-x-12 border border-sky-200/10 bg-white/[0.035] shadow-2xl shadow-slate-950/35 lg:block"
        >
          <div className="absolute inset-x-8 top-12 h-px bg-sky-200/26" />
          <div className="absolute inset-x-16 top-24 h-px bg-emerald-200/28" />
          <div className="absolute inset-x-24 top-36 h-px bg-sky-200/22" />
        </div>
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
            <BrandLogo
              className="mb-7 size-11 shadow-[0_18px_55px_rgba(15,23,42,0.32)] sm:size-12"
              priority
            />
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
