import Image from "next/image";

import { BrandLogo } from "@/components/brand-logo";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { LoginForm } from "@/features/auth/login-form";

export function LoginScreen() {
  return (
    <PremiumMotion
      className="min-h-dvh overflow-hidden bg-white text-zinc-950"
      profile="login"
    >
      <main className="grid min-h-dvh justify-items-center bg-white p-3 pt-6 sm:p-5 sm:pt-6 md:place-items-center lg:p-8">
        <section className="grid w-full max-w-[64rem] overflow-hidden rounded-[1.25rem] bg-white shadow-[0_26px_80px_rgba(9,9,11,0.10)] ring-1 ring-zinc-950/5 sm:rounded-[1.5rem] md:grid-cols-[1.08fr_0.92fr] xl:min-h-[calc(100dvh-4rem)] xl:max-w-[94rem] xl:grid-cols-[1.04fr_0.96fr]">
          <div
            className="relative min-h-[30dvh] overflow-hidden bg-zinc-100 sm:min-h-[36dvh] md:min-h-[34rem] xl:min-h-full"
            data-motion="panel"
          >
            <Image
              alt="AI-assisted upstream operations control room with industrial equipment monitoring"
              className="size-full object-cover"
              fill
              priority
              quality={95}
              sizes="(min-width: 1024px) 52vw, 100vw"
              src="/login-aegis-color-illustration.png"
            />
            <div
              className="absolute inset-x-0 top-0 px-5 pt-5 text-center text-zinc-950 [text-shadow:0_2px_18px_rgba(255,255,255,0.72)] sm:px-7 sm:pt-7 md:px-8 md:pt-8 md:text-left lg:px-10 lg:pt-10"
              data-motion="reveal"
            >
              <h2 className="text-4xl font-semibold leading-none tracking-normal sm:text-5xl md:text-6xl lg:text-7xl">
                AEGIS
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base font-medium leading-6 text-zinc-800 sm:mt-4 sm:text-lg sm:leading-7 md:mx-0 lg:text-xl lg:leading-8">
                AI-Driven Equipment Guardian for Intelligent Surveillance
              </p>
            </div>
          </div>

          <aside
            className="flex items-center justify-center px-6 py-8 sm:px-10 sm:py-10 md:px-8 lg:px-14 xl:min-h-full xl:px-16"
            data-motion="reveal"
          >
            <div className="w-full max-w-[21.25rem] md:max-w-[22rem]">
              <BrandLogo className="mx-auto mb-8 size-10 rounded-none shadow-none sm:mb-10 sm:size-11 md:mb-8" />
              <div>
                <LoginForm />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </PremiumMotion>
  );
}
