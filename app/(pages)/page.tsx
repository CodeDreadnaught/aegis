import { redirect } from "next/navigation";

import { LoginScreen } from "@/features/auth/login-screen";
import { getCurrentUser } from "@/server/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/overview");
  }

  return <LoginScreen />;
}
