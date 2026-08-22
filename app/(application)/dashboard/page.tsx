import type { Metadata } from "next";
import { Bell, ChartLineUp, Pulse, Wrench } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { StatusNote } from "@/components/status-note";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  dashboardStats,
  equipmentSummary,
  recentActivity,
  riskBadgeClass,
} from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "AEGIS - Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        description="Fleet health, risk distribution, maintenance priorities and recent predictive-maintenance activity."
        eyebrow="Operational overview"
        title="Dashboard"
      />
      <StatusNote>
        This dashboard currently uses deterministic demo records while the Prisma-backed data layer is being implemented.
      </StatusNote>
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
              Demo risk states are labelled and not presented as field data.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {equipmentSummary.map((equipment) => (
              <div
                className="data-row grid gap-3 rounded-md border border-border/80 bg-white/70 p-4 md:grid-cols-[1fr_auto]"
                key={equipment.assetTag}
              >
                <div>
                  <p className="font-medium">{equipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {equipment.assetTag} · {equipment.category} · {equipment.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{equipment.healthScore}%</span>
                  <Badge className={riskBadgeClass(equipment.riskLevel)} variant="outline">
                    {equipment.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="premium-panel">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Representative activity stream for foundation UI validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[Pulse, Wrench, Bell].map((Icon, index) => (
              <div className="flex gap-3" key={recentActivity[index]}>
                <div className="grid size-9 shrink-0 place-items-center rounded-md border border-cyan-200 bg-cyan-50 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {recentActivity[index]}
                </p>
              </div>
            ))}
            <div className="rounded-md border border-dashed border-primary/35 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ChartLineUp aria-hidden="true" className="size-4" />
                Predictive model integration is pending AE-08 and AE-09.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
