import Link from "next/link";
import { Plugs } from "@phosphor-icons/react/ssr";

import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-4 py-10 text-zinc-950">
      <section className="grid w-full max-w-3xl place-items-center rounded-[1.5rem] border border-zinc-200 bg-white px-6 py-14 text-center shadow-[0_26px_80px_rgba(9,9,11,0.08)] sm:px-10">
        <BrandLogo className="mb-8 size-12 rounded-none shadow-none" priority />
        <div className="relative h-24 w-full max-w-md overflow-hidden text-zinc-950">
          <div className="absolute left-0 top-1/2 h-1 w-[42%] -translate-y-1/2 rounded-full bg-zinc-950" />
          <div className="absolute right-0 top-1/2 h-1 w-[42%] -translate-y-1/2 rounded-full bg-zinc-950" />
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 bg-white px-3">
            <Plugs className="size-16 text-zinc-950" weight="regular" />
          </div>
        </div>
        <h1 className="mt-2 text-7xl font-semibold leading-none tracking-normal text-zinc-950 sm:text-8xl">
          404
        </h1>
        <Link
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-950 hover:text-white"
          href="/overview"
        >
          Go back home
        </Link>
      </section>
    </main>
  );
}
