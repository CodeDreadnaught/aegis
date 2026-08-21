import { AppShell } from "@/components/app-shell/app-shell";

export default function ApplicationLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
