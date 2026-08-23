import Image from "next/image";

import { BrandLogo } from "@/components/brand-logo";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { LoginForm } from "@/features/auth/login-form";

export function LoginScreen() {
  // Login-only redesign: image-led industrial canvas, required brand statement,
  // and a fixed access rail that contains only the authentication controls.
  return (
    <PremiumMotion
      className="min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50"
      profile="login"
    >
      <main className="relative min-h-dvh">
        <Image
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
          fill
          priority
          quality={95}
          sizes="100vw"
          src="/login-aegis-ai-industrial.png"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-zinc-950/48" />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full bg-zinc-950/72 lg:w-1/2"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-[28rem] border-l border-zinc-800/80 bg-zinc-950/88 backdrop-blur-md lg:block"
        />

        <section className="relative grid min-h-dvh lg:grid-cols-[1fr_28rem]">
          <div
            className="flex min-h-[44dvh] items-end px-6 pb-8 pt-16 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-12"
            data-motion="reveal"
          >
            <div className="max-w-2xl">
              <h1 className="text-6xl font-semibold leading-none tracking-normal text-zinc-50 sm:text-7xl lg:text-8xl">
                AEGIS
              </h1>
              <p className="mt-6 max-w-xl text-xl font-medium leading-8 text-zinc-200 sm:text-2xl sm:leading-9">
                AI-driven equipment guardianship for upstream operations.
              </p>
            </div>
          </div>

          <aside
            className="flex min-h-[56dvh] items-center border-t border-zinc-800/80 bg-zinc-950/90 px-6 py-8 backdrop-blur-md sm:px-8 lg:min-h-dvh lg:border-l lg:border-t-0 lg:bg-transparent lg:px-8"
            data-motion="panel"
          >
            <div className="w-full">
              <BrandLogo className="mb-8 size-8 rounded-lg shadow-none" />
              <LoginForm surface="dark" />
            </div>
          </aside>
        </section>
      </main>
    </PremiumMotion>
  );
}
