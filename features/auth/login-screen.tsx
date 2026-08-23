import Image from "next/image";

import { PremiumMotion } from "@/components/motion/premium-motion";
import { LoginForm } from "@/features/auth/login-form";

export function LoginScreen() {
  // Scope: login only. Desktop uses a fixed two-column viewport; mobile stacks
  // the required brand statement over the form without adding auxiliary content.
  return (
    <PremiumMotion
      className="min-h-dvh overflow-hidden bg-zinc-950 text-white"
      profile="login"
    >
      <main className="relative min-h-dvh">
        <Image
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-95"
          fill
          priority
          quality={95}
          sizes="100vw"
          src="/login-aegis-ai-industrial.png"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.98)_0%,rgba(9,9,11,0.92)_34%,rgba(9,9,11,0.5)_58%,rgba(9,9,11,0.18)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(9,9,11,0.86))]"
        />

        <section className="relative grid min-h-dvh items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(22rem,0.86fr)_minmax(22rem,28rem)] lg:px-12">
          <div className="max-w-2xl" data-motion="reveal">
            <h1 className="text-6xl font-semibold leading-none tracking-normal text-zinc-50 sm:text-7xl lg:text-8xl">
              AEGIS
            </h1>
            <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-zinc-200 sm:text-2xl sm:leading-9">
              AI-driven equipment guardianship for upstream operations.
            </p>
          </div>

          <div
            className="w-full rounded-lg border border-zinc-800/80 bg-zinc-950/82 p-6 shadow-2xl shadow-zinc-950/70 backdrop-blur-md"
            data-motion="panel"
          >
            <LoginForm surface="dark" />
          </div>
        </section>
      </main>
    </PremiumMotion>
  );
}
