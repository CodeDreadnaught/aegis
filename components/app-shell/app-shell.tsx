import { ShieldCheck } from "@phosphor-icons/react/ssr";

import { MobileNavigation } from "@/components/app-shell/mobile-navigation";
import { NavigationLinks } from "@/components/app-shell/navigation-links";
import { logoutAction } from "@/features/auth/actions";
import type { AuthUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  children: React.ReactNode;
  user: AuthUser;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="aegis-workspace min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-cyan-300/10 bg-[linear-gradient(180deg,oklch(0.18_0.055_248),oklch(0.13_0.038_248))] px-4 py-5 text-sidebar-foreground shadow-2xl shadow-slate-950/35 lg:block">
        <div className="mb-8 flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3">
          <div className="grid size-11 place-items-center rounded-md bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30">
            <ShieldCheck aria-hidden="true" className="size-6" weight="fill" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-wide">AEGIS</p>
            <p className="text-xs text-sidebar-foreground/62">
              Intelligent Predictive Maintenance
            </p>
          </div>
        </div>
        <NavigationLinks role={user.role} />
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/76 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">AEGIS</p>
              <p className="text-xs text-muted-foreground">
                AI-Driven Equipment Guardian for Intelligent Surveillance
              </p>
            </div>
            <div className="ml-auto hidden items-center gap-3 text-right lg:flex">
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role.replaceAll("_", " ")}
                </p>
              </div>
              <form action={logoutAction}>
                <Button size="sm" type="submit" variant="outline">
                  Logout
                </Button>
              </form>
            </div>
            <div className="lg:hidden">
              <MobileNavigation role={user.role} />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl animate-in fade-in-0 slide-in-from-bottom-2 px-4 py-6 duration-500 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
