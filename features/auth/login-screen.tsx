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
      <main className="grid min-h-dvh place-items-center bg-white p-4 sm:p-6 lg:p-8">
        <section className="grid w-full overflow-hidden rounded-[1.5rem] bg-white shadow-[0_26px_80px_rgba(9,9,11,0.10)] ring-1 ring-zinc-950/5 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.04fr_0.96fr]">
          <div
            className="relative min-h-[34dvh] overflow-hidden bg-zinc-100 sm:min-h-[42dvh] lg:min-h-full"
            data-motion="panel"
          >
            <Image
              alt="AI-assisted upstream operations control room with industrial equipment monitoring"
              className="size-full object-cover"
              fill
              priority
              quality={95}
              sizes="(min-width: 1024px) 52vw, 100vw"
              src="/login-upstream-ai-maintenance.png"
            />
          </div>

          <aside
            className="flex items-center justify-center px-6 py-10 sm:px-10 lg:min-h-full lg:px-16"
            data-motion="reveal"
          >
            <div className="w-full max-w-[21.25rem]">
              <BrandLogo className="mx-auto mb-8 size-10 rounded-none shadow-none" />
              <h1 className="text-center text-3xl font-semibold leading-tight tracking-normal text-zinc-950">
                Login to your account
              </h1>
              <div className="mt-7">
                <LoginForm />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </PremiumMotion>
  );
}
