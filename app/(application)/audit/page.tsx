import type { Metadata } from "next";
import { Fingerprint, LockKey, Pulse } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Audit",
};

export default async function AuditPage() {
  await requirePermission("viewAudit");

  return (
    <ModuleOverview
      description="Trace significant user and system actions without storing secrets."
      items={[
        { title: "Audit trail", description: "Equipment changes, maintenance actions, predictions, alerts and user changes will be logged.", icon: Pulse },
        { title: "Traceability", description: "Audit entries will link user, action, entity type, entity id and timestamp.", icon: Fingerprint },
        { title: "Secret protection", description: "Passwords, tokens and credentials must never appear in audit metadata.", icon: LockKey },
      ]}
      status="AE-11 is pending. Audit persistence and viewer are not implemented yet."
      title="Audit"
    />
  );
}
