import type { Metadata } from "next";
import { Brain, ChartLineUp, ShieldWarning } from "@phosphor-icons/react/ssr";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runPredictionAction } from "@/features/analytics/actions";
import { getAnalyticsWorkspace } from "@/features/analytics/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";
import modelMetadata from "@/models/ai4i/v1/metadata.json";
import parityReport from "@/models/ai4i/v1/parity-report.json";

export const metadata: Metadata = {
  title: "AEGIS - Predictive Analytics",
};

export const runtime = "nodejs";

export default async function AnalyticsPage() {
  await requirePermission("runPrediction");
  const { predictions, readings } = await getAnalyticsWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Run server-side ONNX inference, calculate health score, classify risk and persist explainable maintenance recommendations."
        eyebrow="Predictive intelligence"
        title="Predictive Analytics"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ModelCard
          icon={Brain}
          label="Model"
          value={modelMetadata.model_version}
        />
        <ModelCard
          icon={ChartLineUp}
          label="Parity"
          value={parityReport.passed ? "Passed" : "Failed"}
        />
        <ModelCard
          icon={ShieldWarning}
          label="Tolerance"
          value={String(parityReport.tolerance)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <Card className="premium-panel motion-card">
          <CardHeader className="border-b">
            <CardTitle>Operational readings ready for inference</CardTitle>
            <CardDescription>
              Each action runs the approved ONNX model server-side and stores
              traceable prediction output.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {readings.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6">Equipment</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead>Latest prediction</TableHead>
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => {
                    const latestPrediction = reading.predictions[0];

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
                          {reading.recordedAt.toLocaleString("en-GB")}
                        </TableCell>
                        <TableCell>
                          {latestPrediction ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                className={riskBadgeClass(
                                  latestPrediction.riskLevel
                                )}
                                variant="outline"
                              >
                                {formatEquipmentCategory(
                                  latestPrediction.riskLevel
                                )}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {latestPrediction.healthScore.toString()}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not run
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <form action={runPredictionAction.bind(null, reading.id)}>
                            <button
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                              type="submit"
                            >
                              <Brain />
                              Run
                            </button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                  <Brain className="size-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">
                  No readings available
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Capture operational readings before running predictive
                  inference.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="premium-panel motion-card">
          <CardHeader>
            <CardTitle>Stored predictions</CardTitle>
            <CardDescription>
              Recent persisted outputs with model and threshold versions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.length ? (
              predictions.map((prediction) => (
                <div
                  className="rounded-lg border bg-background/70 p-3"
                  key={prediction.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">
                        {prediction.equipment.assetTag}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {prediction.equipment.name}
                      </div>
                    </div>
                    <Badge
                      className={riskBadgeClass(prediction.riskLevel)}
                      variant="outline"
                    >
                      {formatEquipmentCategory(prediction.riskLevel)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>
                      Pf:{" "}
                      {(Number(prediction.failureProbability) * 100).toFixed(2)}
                      %
                    </span>
                    <span>Health: {prediction.healthScore.toString()}%</span>
                    <span>{prediction.modelVersion}</span>
                    <span>{prediction.thresholdVersion}</span>
                  </div>
                  {prediction.recommendations[0] && (
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {prediction.recommendations[0].message}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-primary/35 bg-primary/5 p-4 text-sm text-muted-foreground">
                No prediction outputs have been persisted yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ModelIcon = typeof Brain;

function ModelCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ModelIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="motion-card">
      <CardContent className="flex-row items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {value}
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
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
