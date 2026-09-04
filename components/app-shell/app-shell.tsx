import { Bell, Power, UserCircle } from "@phosphor-icons/react/ssr";

import { BrandLogo } from "@/components/brand-logo";
import { MobileNavigation } from "@/components/app-shell/mobile-navigation";
import { NavigationLinks } from "@/components/app-shell/navigation-links";
import { TopNavigation } from "@/components/app-shell/top-navigation";
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
  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <PremiumMotion
      className="min-h-dvh bg-[#f3f3f1] text-zinc-950"
      profile="workspace"
    >
      <aside className="fixed inset-y-4 left-4 z-40 hidden w-14 flex-col items-center justify-between lg:flex">
        <div className="grid gap-4">
          <div
            className="rounded-full border border-zinc-200 bg-white p-2 shadow-[0_18px_48px_rgba(24,24,27,0.08)]"
            data-motion="reveal"
          >
            <NavigationLinks compact role={user.role} section="primary" />
          </div>
          <div
            className="rounded-full border border-zinc-200 bg-white p-2 shadow-[0_18px_48px_rgba(24,24,27,0.08)]"
            data-motion="reveal"
          >
            <NavigationLinks compact role={user.role} section="secondary" />
          </div>
        </div>

        <div
          className="rounded-full border border-zinc-200 bg-white p-2 shadow-[0_18px_48px_rgba(24,24,27,0.08)]"
          data-motion="reveal"
        >
          <NavigationLinks compact role={user.role} section="admin" />
          <form action={logoutAction} className="mt-1">
            <Button
              className="size-10 rounded-full border-0 bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              size="icon"
              type="submit"
              variant="ghost"
            >
              <Power aria-hidden="true" className="size-4" weight="bold" />
              <span className="sr-only">Logout</span>
            </Button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-24">
        <header className="sticky top-0 z-30 px-3 pt-3 lg:px-5">
          <div className="relative mx-auto grid max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[1.35rem] border border-zinc-200 bg-white px-3 py-3 shadow-[0_16px_60px_rgba(24,24,27,0.06)]">
            <div className="flex min-w-0 items-center gap-3 lg:justify-start">
              <div className="lg:hidden">
                <MobileNavigation role={user.role} />
              </div>
              <BrandLogo className="absolute left-1/2 size-9 -translate-x-1/2 rounded-full bg-transparent shadow-none lg:static lg:translate-x-0" />
              <div className="hidden min-w-0 lg:block">
                <p className="text-sm font-bold text-emerald-600">AEGIS</p>
              </div>
            </div>

            <div className="flex min-w-0 justify-center">
              <TopNavigation role={user.role} />
            </div>

            <div className="ml-auto flex items-center justify-end gap-2">
              <Button
                className="size-10 rounded-full border-0 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                size="icon"
                variant="ghost"
              >
                <Bell aria-hidden="true" className="size-4" />
                <span className="sr-only">View notifications</span>
              </Button>
              <div className="hidden items-center gap-2 rounded-full bg-zinc-50 py-1 pl-1 pr-2 lg:flex">
                <div className="grid size-8 place-items-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                  {userInitial || (
                    <UserCircle aria-hidden="true" className="size-5" weight="fill" />
                  )}
                </div>
                <div className="min-w-0 pr-1">
                  <p className="max-w-32 truncate text-xs font-semibold">
                    {user.name}
                  </p>
                  <p className="truncate text-[10px] uppercase text-zinc-500">
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
