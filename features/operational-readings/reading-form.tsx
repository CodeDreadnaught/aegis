"use client";

import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import {
  Database,
  Plus,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatSourceType,
  productTypes,
  sourceTypes,
} from "@/features/operational-readings/validation";
import {
  getTelemetryRule,
  telemetryFieldNames,
  type TelemetryFieldName,
} from "@/features/operational-readings/telemetry-rules";
import type { EquipmentCategory } from "@/generated/prisma/enums";
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

const ImportPreviewField = dynamic(() =>
  import("@/features/imports/import-preview-field").then(
    (module) => module.ImportPreviewField
  )
);

type ReadingFormProps = {
  action: (formData: FormData) => Promise<{
    count: number;
    importMode?: "LIVE_IMPORT" | "HISTORICAL_IMPORT";
    predictions?: {
      created: number;
      failed: number;
      queued?: number;
      skipped: number;
    };
    processed?: number;
    skippedDuplicates?: number;
  } | void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    category: EquipmentCategory;
    name: string;
  }>;
  onEquipmentChange?: (equipmentId: string) => void;
  selectedEquipmentId?: string;
};

type ManualReadingRow = {
  id: string;
};

type ReadingFieldConfig = {
  label: string;
  step: string;
};

const readingFieldConfigs = {
  airTemperatureKelvin: { label: "Air temperature (K)", step: "0.01" },
  processTemperatureKelvin: { label: "Process temperature (K)", step: "0.01" },
  rotationalSpeedRpm: { label: "Rotational speed (rpm)", step: "1" },
  torqueNm: { label: "Torque (Nm)", step: "0.01" },
  toolWearMinutes: { label: "Tool wear (min)", step: "1" },
  pressureBar: { label: "Pressure (bar)", step: "0.01" },
  vibrationMmS: { label: "Vibration (mm/s)", step: "0.01" },
  flowRateBpd: { label: "Flow rate (bpd)", step: "1" },
  operatingHours: { label: "Operating hours", step: "0.1" },
} satisfies Record<TelemetryFieldName, ReadingFieldConfig>;
export function ReadingForm({
  action,
  equipment,
  onEquipmentChange,
  selectedEquipmentId = equipment[0]?.id ?? "",
}: ReadingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sourceType, setSourceType] = useState("MANUAL_ENTRY");
  const [manualRows, setManualRows] = useState<ManualReadingRow[]>([
    { id: "reading-row-1" },
  ]);
  const [pending, startTransition] = useTransition();
  const now = new Date().toISOString().slice(0, 16);
  const isSensorImport = sourceType === "SENSOR_IMPORT";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        formRef.current?.reset();
        setSourceType("MANUAL_ENTRY");
        setManualRows([{ id: `reading-row-${Date.now()}` }]);
        toast.success({
          title: isSensorImport ? "Readings imported" : "Readings saved",
          description: formatReadingResult(result, isSensorImport),
        });
      } catch (error) {
        toast.error({
          title: "Reading was not saved",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  function addManualRow() {
    setManualRows((rows) => [
      ...rows,
      { id: `reading-row-${Date.now()}-${rows.length}` },
    ]);
  }

  function removeManualRow(rowId: string) {
    setManualRows((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)
    );
  }

  return (
    <Card
      className="w-full max-w-full min-w-0 rounded-[1.35rem] border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="pb-2">
        <CardTitle>Record Reading</CardTitle>
        <p className="text-sm text-zinc-500">Manual or import</p>
      </CardHeader>
      <CardContent>
        <form
          className="grid min-w-0 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <div className="grid min-w-0 gap-2 md:col-span-2">
            <Label htmlFor="sourceType">Source</Label>
            <select
              className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
              id="sourceType"
              name="sourceType"
              onChange={(event) => {
                setSourceType(event.currentTarget.value);
              }}
              value={sourceType}
            >
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {formatSourceType(sourceType)}
                </option>
              ))}
            </select>
          </div>
          {!isSensorImport && (
            <div className="grid min-w-0 gap-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-500">
                  {manualRows.length === 1
                    ? "Manual reading"
                    : `${manualRows.length} manual readings`}
                </p>
                <button
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline"
                  onClick={addManualRow}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add another
                </button>
              </div>
              {manualRows.map((row, index) => (
                <div
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  key={row.id}
                >
                  {manualRows.length > 1 ? (
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Reading {index + 1}
                      </p>
                      <Button
                        className="rounded-full text-red-600 hover:text-red-700"
                        onClick={() => removeManualRow(row.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash />
                        Remove
                      </Button>
                    </div>
                  ) : null}
                  <ManualReadingFields
                    equipment={equipment}
                    onEquipmentChange={onEquipmentChange}
                    rowId={row.id}
                    selectedEquipmentId={selectedEquipmentId}
                    timestamp={now}
                  />
                </div>
              ))}
            </div>
          )}
          {isSensorImport && (
            <div className="grid min-w-0 gap-4 md:col-span-2">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="importMode">Import purpose</Label>
                <select
                  className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
                  defaultValue="LIVE_IMPORT"
                  disabled={pending}
                  id="importMode"
                  name="importMode"
                >
                  <option value="LIVE_IMPORT">Live/current readings</option>
                  <option value="HISTORICAL_IMPORT">Historical/reference readings</option>
                </select>
              </div>
              <ImportPreviewField
                disabled={pending}
                kind="operationalReadings"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <Button
              className="h-11 w-full rounded-full bg-[#009966] px-5 text-white shadow-sm hover:bg-[#007a55] hover:text-white focus-visible:ring-[#009966]/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!equipment.length || pending}
              type="submit"
            >
              {pending ? (
                <SpinnerGap className="animate-spin" />
              ) : (
                <Database />
              )}
              {pending
                ? isSensorImport
                  ? "Importing readings"
                  : "Saving reading"
                : isSensorImport
                  ? "Import readings"
                  : "Save reading"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ManualReadingFields({
  equipment,
  onEquipmentChange,
  rowId,
  selectedEquipmentId,
  timestamp,
}: {
  equipment: ReadingFormProps["equipment"];
  onEquipmentChange?: (equipmentId: string) => void;
  rowId: string;
  selectedEquipmentId: string;
  timestamp: string;
}) {
  const [currentEquipmentId, setCurrentEquipmentId] = useState(selectedEquipmentId);
  const selectedEquipment =
    equipment.find((item) => item.id === currentEquipmentId) ?? equipment[0];
  const category = selectedEquipment?.category ?? "PUMP";

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <div className="grid min-w-0 gap-2 md:col-span-2">
        <Label htmlFor={`equipmentId-${rowId}`}>Equipment</Label>
        <select
          className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
          disabled={!equipment.length}
          id={`equipmentId-${rowId}`}
          name="equipmentId"
          onChange={(event) => {
            setCurrentEquipmentId(event.currentTarget.value);
            onEquipmentChange?.(event.currentTarget.value);
          }}
          required
          value={currentEquipmentId}
        >
          {!equipment.length ? <option value="">No equipment available</option> : null}
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.assetTag} - {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`recordedAt-${rowId}`}>Recorded at</Label>
        <Input
          className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 shadow-inner shadow-zinc-950/5"
          defaultValue={timestamp}
          id={`recordedAt-${rowId}`}
          name="recordedAt"
          required
          type="datetime-local"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`type-${rowId}`}>Product type</Label>
        <select
          className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
          defaultValue="M"
          id={`type-${rowId}`}
          name="type"
        >
          {productTypes.map((type) => (
            <option key={type} value={type}>
              Type {type}
            </option>
          ))}
        </select>
      </div>
      {telemetryFieldNames.map((field) => {
        const config = readingFieldConfigs[field];
        const rule = getTelemetryRule(category, field);

        if (rule.applicability === "NOT_APPLICABLE") {
          return rule.modelDefault === undefined ? null : (
            <input key={field} name={field} type="hidden" value={rule.modelDefault} />
          );
        }

        return (
          <NumberField
            key={field}
            label={config.label}
            name={field}
            min={rule.applicability === "REQUIRED_POSITIVE" ? "0.000001" : "0"}
            required={rule.applicability.startsWith("REQUIRED")}
            rowId={rowId}
            step={config.step}
          />
        );
      })}
    </div>
  );
}

function formatReadingResult(
  result:
    | {
        count: number;
        importMode?: "LIVE_IMPORT" | "HISTORICAL_IMPORT";
        predictions?: {
          created: number;
          failed: number;
          queued?: number;
          skipped: number;
        };
        processed?: number;
        skippedDuplicates?: number;
      }
    | void,
  isSensorImport: boolean
) {
  const readingCount = result?.count ?? 1;
  const processedCount = result?.processed ?? readingCount;
  const skippedDuplicates = result?.skippedDuplicates ?? 0;
  const readingLabel =
    readingCount === 1
      ? "1 reading"
      : `${readingCount.toLocaleString()} readings`;
  const predictionCount = result?.predictions?.created ?? 0;
  const failedCount = result?.predictions?.failed ?? 0;
  const queuedCount = result?.predictions?.queued ?? 0;

  if (isSensorImport && skippedDuplicates > 0) {
    const duplicateLabel =
      skippedDuplicates === 1
        ? "1 duplicate skipped"
        : `${skippedDuplicates.toLocaleString()} duplicates skipped`;
    const processedLabel = `${processedCount.toLocaleString()} rows processed`;

    if (result?.importMode === "HISTORICAL_IMPORT") {
      return `${processedLabel}. ${readingLabel} imported, ${duplicateLabel}. Historical rows were not queued for prediction.`;
    }

    if (queuedCount > 0) {
      return `${processedLabel}. ${readingLabel} imported, ${duplicateLabel}. ${formatQueuedPredictions(queuedCount)}.`;
    }

    return `${processedLabel}. ${readingLabel} imported, ${duplicateLabel}.`;
  }

  if (isSensorImport && result?.importMode === "HISTORICAL_IMPORT") {
    return `${readingLabel} imported for history. No prediction jobs were queued.`;
  }

  if (failedCount > 0) {
    return `${readingLabel} saved. ${failedCount.toLocaleString()} prediction runs need review.`;
  }

  if (predictionCount > 0) {
    return `${readingLabel} saved with ${predictionCount.toLocaleString()} prediction runs.`;
  }

  if (queuedCount > 0) {
    return `${readingLabel} saved. ${formatQueuedPredictions(queuedCount)}.`;
  }

  return isSensorImport
    ? `${readingLabel} imported.`
    : "The operational data point was recorded.";
}

function formatQueuedPredictions(count: number) {
  const label =
    count === 1 ? "1 prediction job" : `${count.toLocaleString()} prediction jobs`;

  return `${label} queued`;
}

function NumberField({
  label,
  name,
  min,
  required = false,
  rowId,
  step,
}: {
  label: string;
  name: string;
  min?: string;
  required?: boolean;
  rowId?: string;
  step: string;
}) {
  const inputId = rowId ? `${name}-${rowId}` : name;

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4 shadow-inner shadow-zinc-950/5"
        id={inputId}
        min={min}
        name={name}
        required={required}
        step={step}
        type="number"
      />
    </div>
  );
}
