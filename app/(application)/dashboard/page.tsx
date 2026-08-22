import type { Metadata } from "next";
import { Bell, ChartLineUp, Pulse, Wrench } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardOverview } from "@/features/dashboard/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Dashboard",
};

export default async function DashboardPage() {
  await requirePermission("viewEquipment");
  const { latestPredictions, recentActivity, stats } =
    await getDashboardOverview();

  const dashboardStats = [
    {
      label: "Total Equipment",
      value: stats.equipmentCount,
      detail: `${stats.activeEquipmentCount} active assets`,
    },
    {
      label: "Low Risk",
      value: stats.riskCounts.low,
      detail: "Stored prediction outputs",
    },
    {
      label: "Medium Risk",
      value: stats.riskCounts.medium,
      detail: "Stored prediction outputs",
    },
    {
      label: "High Risk",
      value: stats.riskCounts.high,
      detail: `${stats.activeAlertCount} active alerts`,
    },
  ];

  return (
    <>
      <PageHeader
        description="Fleet health, risk distribution, maintenance priorities and recent predictive-maintenance activity."
        eyebrow="Operational overview"
        title="Dashboard"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Card
            className="premium-panel motion-card overflow-hidden"
            key={stat.label}
          >
            <CardHeader className="pb-2">
              <CardDescription className="font-medium uppercase tracking-[0.12em]">
                {stat.label}
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-normal">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {stat.detail}
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="premium-panel">
          <CardHeader>
            <CardTitle>Highest-Risk Equipment</CardTitle>
            <CardDescription>
              Stored prediction outputs only; no synthetic risk states are shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {latestPredictions.length ? (
              latestPredictions.map((prediction) => (
                <div
                  className="data-row grid gap-3 rounded-md border border-border/80 bg-white/70 p-4 md:grid-cols-[1fr_auto]"
                  key={prediction.id}
                >
                  <div>
                    <p className="font-medium">{prediction.equipment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {prediction.equipment.assetTag} /{" "}
                      {formatEquipmentCategory(prediction.equipment.category)} /{" "}
                      {prediction.equipment.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {prediction.healthScore.toString()}%
                    </span>
                    <Badge
                      className={riskBadgeClass(prediction.riskLevel)}
                      variant="outline"
                    >
                      {formatEquipmentCategory(prediction.riskLevel)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-primary/35 bg-primary/5 p-4 text-sm text-muted-foreground">
                No prediction outputs are stored yet. Run the approved model
                workflow after ONNX artefacts are available.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="premium-panel">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest operational, maintenance and alert events from the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {recentActivity.length ? (
              recentActivity.map((activity, index) => {
                const icons = [Pulse, Wrench, Bell] as const;
                const Icon = icons[index % icons.length];

                return (
                  <div className="flex gap-3" key={activity.id}>
                    <div className="grid size-9 shrink-0 place-items-center rounded-md border border-cyan-200 bg-cyan-50 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {activity.type}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {activity.detail}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-primary/35 bg-primary/5 p-4 text-sm text-muted-foreground">
                Operational activity will appear here as readings, maintenance
                records and alerts are captured.
              </div>
            )}
            <div className="rounded-md border border-dashed border-primary/35 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ChartLineUp aria-hidden="true" className="size-4" />
                {stats.maintenanceDueCount} planned or in-progress maintenance
                records are currently tracked.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function riskBadgeClass(riskLevel: string) {
  if (riskLevel === "LOW") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (riskLevel === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}
