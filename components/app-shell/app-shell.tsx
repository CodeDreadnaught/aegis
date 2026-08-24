import {
  Bell,
  CaretRight,
  MagnifyingGlass,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react/ssr";

import { BrandLogo } from "@/components/brand-logo";
import { MobileNavigation } from "@/components/app-shell/mobile-navigation";
import { NavigationLinks } from "@/components/app-shell/navigation-links";
import { PremiumMotion } from "@/components/motion/premium-motion";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import type { AuthUser } from "@/server/auth/session";

type AppShellProps = {
  children: React.ReactNode;
  user: AuthUser;
};

export function AppShell({ children, user }: AppShellProps) {
  const roleLabel = user.role.replaceAll("_", " ");

  return (
    <PremiumMotion
      className="min-h-dvh bg-[#f6f6f4] text-zinc-950"
      profile="workspace"
    >
      <aside className="fixed inset-y-3 left-3 hidden w-[17rem] rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_24px_80px_rgba(24,24,27,0.08)] lg:block">
        <div className="flex items-center gap-3 px-2 py-2" data-motion="reveal">
          <BrandLogo className="size-10 rounded-lg bg-transparent shadow-none" />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-normal">AEGIS</p>
            <p className="truncate text-xs text-zinc-500">
              Intelligent Surveillance
            </p>
          </div>
        </div>

        <div className="mt-5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Menu
        </div>
        <div className="mt-2" data-motion="reveal">
          <NavigationLinks role={user.role} />
        </div>

        <div
          className="absolute inset-x-3 bottom-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          data-motion="reveal"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-zinc-950 text-white">
              <UserCircle aria-hidden="true" className="size-5" weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] uppercase text-zinc-500">
                {roleLabel}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              className="h-10 w-full justify-between rounded-full border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white"
              size="sm"
              type="submit"
              variant="outline"
            >
              Logout
              <SignOut aria-hidden="true" className="size-4" />
            </Button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[18.5rem]">
        <header className="sticky top-0 z-30 px-3 pt-3 lg:px-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/92 px-3 py-3 shadow-[0_16px_60px_rgba(24,24,27,0.07)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <MobileNavigation role={user.role} />
              </div>
              <div className="hidden items-center gap-2 text-xs font-medium text-zinc-500 sm:flex">
                <span>AEGIS</span>
                <CaretRight aria-hidden="true" className="size-3" />
                <span>Dashboard</span>
              </div>
            </div>

            <div className="hidden h-10 min-w-[18rem] items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-500 md:flex">
              <MagnifyingGlass aria-hidden="true" className="size-4" />
              <span>Search assets</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                className="size-10 rounded-full border-zinc-200 bg-white"
                size="icon"
                variant="outline"
              >
                <Bell aria-hidden="true" className="size-4" />
                <span className="sr-only">View notifications</span>
              </Button>
              <div className="hidden items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-1 pr-3 lg:flex">
                <div className="grid size-8 place-items-center rounded-full bg-zinc-950 text-white">
                  <UserCircle aria-hidden="true" className="size-5" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="max-w-36 truncate text-sm font-semibold">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] uppercase text-zinc-500">
                    {roleLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-3 py-4 lg:px-5">
          <div data-motion="reveal">{children}</div>
        </main>
      </div>
    </PremiumMotion>
  );
}
