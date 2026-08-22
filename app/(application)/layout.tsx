import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentUser } from "@/server/auth/session";

export default async function ApplicationLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
