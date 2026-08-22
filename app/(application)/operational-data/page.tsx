import type { Metadata } from "next";
import { Database, Gauge, SlidersHorizontal } from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createOperationalReadingAction } from "@/features/operational-readings/actions";
import { getOperationalDataWorkspace } from "@/features/operational-readings/queries";
import { ReadingForm } from "@/features/operational-readings/reading-form";
import { formatSourceType } from "@/features/operational-readings/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Operational Data",
};

export default async function OperationalDataPage() {
  await requirePermission("recordOperationalData");
  const { equipment, readings } = await getOperationalDataWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Record equipment-associated operational readings and keep trained AI4I feature inputs distinct from contextual plant parameters."
        eyebrow="Operational telemetry"
        title="Operational Data"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="premium-panel motion-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5 text-primary" />
              Recent readings
            </CardTitle>
            <CardDescription>
              Latest captured readings available for analytics and traceability.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {readings.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6">Equipment</TableHead>
                    <TableHead>AI4I features</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="pr-6">Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => {
                    const parameters = asReadingParameters(reading.parameters);

                    return (
                      <TableRow key={reading.id} className="data-row">
                        <TableCell className="pl-6">
                          <div className="font-medium text-foreground">
                            {reading.equipment.assetTag}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reading.equipment.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary">
                              Type {parameters.type ?? "M"}
                            </Badge>
                            <Badge variant="outline">
                              {formatNumber(parameters.torqueNm)} Nm
                            </Badge>
                            <Badge variant="outline">
                              {formatNumber(parameters.toolWearMinutes)} min
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(parameters.pressureBar)} bar
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(parameters.vibrationMmS)} mm/s
                          </div>
                        </TableCell>
                        <TableCell>{formatSourceType(reading.sourceType)}</TableCell>
                        <TableCell className="pr-6">
                          <div className="text-sm text-foreground">
                            {reading.recordedAt.toLocaleDateString("en-GB")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reading.createdBy?.name ?? "System"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                  <Database className="size-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  No readings recorded
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Capture a reading to make operational data available for
                  analytics, reporting and equipment traceability.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ReadingForm
            action={createOperationalReadingAction}
            equipment={equipment}
          />
          <Card className="motion-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-primary" />
                Feature boundary
              </CardTitle>
              <CardDescription>
                AI4I model inputs are kept explicit; contextual values support
                operational review without being misreported as model features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ReadingParameters = {
  type?: string;
  torqueNm?: number;
  toolWearMinutes?: number;
  pressureBar?: number;
  vibrationMmS?: number;
};

function asReadingParameters(value: unknown): ReadingParameters {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ReadingParameters;
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-GB") : "Not set";
}
