import {
  Bell,
  CaretRight,
  ShieldCheck,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react/ssr";

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
    <PremiumMotion className="aegis-workspace min-h-dvh" profile="workspace">
      <aside className="fixed inset-y-3 left-3 hidden w-72 rounded-lg border border-white/10 bg-[linear-gradient(180deg,oklch(0.18_0.026_248),oklch(0.12_0.018_248))] p-3 text-sidebar-foreground shadow-2xl shadow-slate-950/35 lg:block">
        <div
          className="mb-4 rounded-md border border-white/10 bg-white/[0.045] p-3"
          data-motion="reveal"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-emerald-950/30">
              <ShieldCheck aria-hidden="true" className="size-6" weight="fill" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal">AEGIS</p>
              <p className="text-xs text-sidebar-foreground/62">
                Intelligent Surveillance
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1">
            {["Live", "Risk", "AI"].map((item) => (
              <div
                className="rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 text-center text-[11px] font-medium text-sidebar-foreground/70"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/42">
          Command
        </div>
        <div data-motion="reveal">
          <NavigationLinks role={user.role} />
        </div>
        <div
          className="absolute inset-x-3 bottom-3 rounded-md border border-white/10 bg-white/[0.055] p-3"
          data-motion="reveal"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-white/10 text-sidebar-foreground">
              <UserCircle aria-hidden="true" className="size-5" weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/58">
                {roleLabel}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              className="w-full justify-between"
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
      <div className="lg:pl-[19.5rem]">
        <header className="sticky top-0 z-30 px-3 pt-3 lg:px-6">
          <div className="aegis-panel flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <MobileNavigation role={user.role} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>AEGIS</span>
                  <CaretRight aria-hidden="true" className="size-3" />
                  <span>Operations Console</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  AI-Driven Equipment Guardian
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.75)]" />
                Production ready
              </div>
              <Button size="icon" variant="outline">
                <Bell aria-hidden="true" className="size-4" />
                <span className="sr-only">View notifications</span>
              </Button>
              <div className="hidden items-center gap-3 rounded-md border border-border/70 bg-white/70 px-3 py-1.5 text-right lg:flex">
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-[11px] uppercase text-muted-foreground">
                    {roleLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-3 py-6 lg:px-6">
          <div data-motion="reveal">{children}</div>
        </div>
      </div>
    </PremiumMotion>
  );
}
