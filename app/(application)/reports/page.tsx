import type { Metadata } from "next";
import { DownloadSimple, FileCsv, Files } from "@phosphor-icons/react/ssr";

import { ModuleOverview } from "@/components/module-overview";

export const metadata: Metadata = {
  title: "AEGIS - Reports",
};

export default function ReportsPage() {
  return (
    <ModuleOverview
      description="Generate equipment, maintenance, prediction, risk and alert reports with role checks."
      items={[
        { title: "Equipment report", description: "Fleet reports will summarize category, status, location and traceable asset details.", icon: Files },
        { title: "CSV export", description: "CSV export is sufficient for the required project scope where appropriate.", icon: FileCsv },
        { title: "Evidence outputs", description: "Final report evidence will link requirements to files, tests and screenshots.", icon: DownloadSimple },
      ]}
      status="AE-14 is pending. Report generation is not implemented yet."
      title="Reports"
    />
  );
}
