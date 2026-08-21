import { ShieldCheck } from "@phosphor-icons/react/ssr";

import { MobileNavigation } from "@/components/app-shell/mobile-navigation";
import { NavigationLinks } from "@/components/app-shell/navigation-links";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,oklch(0.92_0.055_196),transparent_34rem),linear-gradient(180deg,oklch(0.985_0.006_231),oklch(0.955_0.014_236))]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-cyan-950/20">
            <ShieldCheck aria-hidden="true" className="size-6" weight="fill" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-wide">AEGIS</p>
            <p className="text-xs text-sidebar-foreground/62">
              Intelligent Predictive Maintenance
            </p>
          </div>
        </div>
        <NavigationLinks />
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/82 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">AEGIS</p>
              <p className="text-xs text-muted-foreground">
                AI-Driven Equipment Guardian for Intelligent Surveillance
              </p>
            </div>
            <div className="lg:hidden">
              <MobileNavigation />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
