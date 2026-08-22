import type { Metadata } from "next";
import { LockKey, UserGear, Users } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - User Management",
};

export default async function UsersPage() {
  await requirePermission("manageUsers");

  return (
    <ModuleOverview
      description="Administrator-only user management for authorised AEGIS accounts and role assignments."
      items={[
        { title: "User administration", description: "Administrators will create users and update role/status without exposing sensitive fields.", icon: Users },
        { title: "Role control", description: "Administrator, Maintenance Engineer and Operations Manager permissions will be enforced server-side.", icon: UserGear },
        { title: "Access protection", description: "Hidden controls are not access control; protected mutations will verify permissions on the server.", icon: LockKey },
      ]}
      status="AE-15 is pending. User administration is not active yet."
      title="User Management"
    />
  );
}
