import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarCheck,
  ChartLine,
  ChartLineUp,
  PencilSimple,
  ShieldWarning,
} from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decommissionEquipmentAction } from "@/features/equipment/actions";
import { getEquipmentDetails } from "@/features/equipment/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

type EquipmentDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "AEGIS - Equipment Profile",
};

export default async function EquipmentDetailsPage({
  params,
}: EquipmentDetailsPageProps) {
  await requirePermission("viewEquipment");
  const { id } = await params;
  const equipment = await getEquipmentDetails(id);

  if (!equipment) {
    notFound();
  }

  const decommission = decommissionEquipmentAction.bind(null, equipment.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          description={`${equipment.assetTag} is tracked with linked readings, maintenance history and prediction outputs.`}
          eyebrow={formatEquipmentCategory(equipment.category)}
          title={equipment.name}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={`/equipment/${equipment.id}/edit`}
          >
            <PencilSimple />
            Edit
          </Link>
          <form action={decommission}>
            <button
              className={buttonVariants({
                variant: "destructive",
                className: "w-full sm:w-fit",
              })}
              type="submit"
            >
              <ShieldWarning />
              Decommission
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="premium-panel motion-card">
          <CardHeader>
            <CardTitle>Asset profile</CardTitle>
            <CardDescription>
              Canonical equipment metadata used by operational workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Asset tag" value={equipment.assetTag} />
            <ProfileField
              label="Status"
              value={formatEquipmentCategory(equipment.status)}
            />
            <ProfileField label="Location" value={equipment.location} />
            <ProfileField
              label="Manufacturer"
              value={equipment.manufacturer ?? "Not recorded"}
            />
            <ProfileField
              label="Model"
              value={equipment.model ?? "Not recorded"}
            />
            <ProfileField
              label="Serial number"
              value={equipment.serialNumber ?? "Not recorded"}
            />
            <ProfileField
              label="Installed"
              value={
                equipment.installationDate
                  ? equipment.installationDate.toLocaleDateString("en-GB")
                  : "Not recorded"
              }
            />
            <div className="sm:col-span-2">
              <ProfileField
                label="Description"
                value={equipment.description ?? "No description recorded"}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Traceability</CardTitle>
            <CardDescription>
              Linked operational evidence available for this asset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryPill
              icon={ChartLine}
              label="Recent readings"
              value={equipment.operationalReadings.length}
            />
            <SummaryPill
              icon={CalendarCheck}
              label="Maintenance entries"
              value={equipment.maintenanceRecords.length}
            />
            <SummaryPill
              icon={ChartLineUp}
              label="Predictions"
              value={equipment.predictions.length}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

type SummaryIcon = typeof ChartLine;

function SummaryPill({
  icon: Icon,
  label,
  value,
}: {
  icon: SummaryIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Badge variant="secondary">{value}</Badge>
    </div>
  );
}
