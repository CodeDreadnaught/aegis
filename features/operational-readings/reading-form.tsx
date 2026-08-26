"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Database, SpinnerGap, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatSourceType,
  productTypes,
  sourceTypes,
} from "@/features/operational-readings/validation";
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

type ReadingFormProps = {
  action: (formData: FormData) => Promise<{
    count: number;
    predictions?: {
      created: number;
      failed: number;
      skipped: number;
    };
  } | void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
  onEquipmentChange?: (equipmentId: string) => void;
  selectedEquipmentId?: string;
};

export function ReadingForm({
  action,
  equipment,
  onEquipmentChange,
  selectedEquipmentId = equipment[0]?.id ?? "",
}: ReadingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState("MANUAL_ENTRY");
  const [importPromptOpen, setImportPromptOpen] = useState(false);
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [pending, startTransition] = useTransition();
  const now = new Date().toISOString().slice(0, 16);
  const isSensorImport = sourceType === "SENSOR_IMPORT";

  useEffect(() => {
    if (!importPromptOpen) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlScrollbarGutter = html.style.scrollbarGutter;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "auto";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.scrollbarGutter = previousHtmlScrollbarGutter;
      body.style.overflow = previousBodyOverflow;
    };
  }, [importPromptOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        formRef.current?.reset();
        setSourceType("MANUAL_ENTRY");
        setImportPromptOpen(false);
        setSelectedImportFileName("");
        toast.success({
          title: isSensorImport ? "Readings imported" : "Reading saved",
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

  return (
    <Card
      className="min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5 text-zinc-500" />
          Record reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid min-w-0 gap-4 px-1 pb-1 md:grid-cols-2"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <div className="grid min-w-0 gap-2 md:col-span-2">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              disabled={!equipment.length}
              id="equipmentId"
              name="equipmentId"
              onChange={(event) => onEquipmentChange?.(event.currentTarget.value)}
              required
              value={selectedEquipmentId}
            >
              {!equipment.length ? (
                <option value="">No equipment available</option>
              ) : null}
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.assetTag} - {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="recordedAt">Recorded at</Label>
            <Input
              className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4"
              defaultValue={now}
              disabled={isSensorImport}
              id="recordedAt"
              name="recordedAt"
              required={!isSensorImport}
              type="datetime-local"
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="sourceType">Source</Label>
            <select
              className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              defaultValue="MANUAL_ENTRY"
              id="sourceType"
              name="sourceType"
              onChange={(event) => {
                setSourceType(event.currentTarget.value);
                setImportPromptOpen(false);
                setSelectedImportFileName("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
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
            <>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="type">Product type</Label>
                <select
                  className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
                  defaultValue="M"
                  id="type"
                  name="type"
                >
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      Type {type}
                    </option>
                  ))}
                </select>
              </div>
              <NumberField
                label="Air temperature (K)"
                name="airTemperatureKelvin"
                required
                step="0.01"
              />
              <NumberField
                label="Process temperature (K)"
                name="processTemperatureKelvin"
                required
                step="0.01"
              />
              <NumberField
                label="Rotational speed (rpm)"
                name="rotationalSpeedRpm"
                required
                step="1"
              />
              <NumberField label="Torque (Nm)" name="torqueNm" required step="0.01" />
              <NumberField
                label="Tool wear (min)"
                name="toolWearMinutes"
                required
                step="1"
              />
              <NumberField label="Pressure (bar)" name="pressureBar" step="0.01" />
              <NumberField
                label="Vibration (mm/s)"
                name="vibrationMmS"
                step="0.01"
              />
              <NumberField label="Flow rate (bpd)" name="flowRateBpd" step="1" />
              <NumberField
                label="Operating hours"
                name="operatingHours"
                step="0.1"
              />
            </>
          )}
          {isSensorImport && (
            <div className="grid min-w-0 gap-2 md:col-span-2">
              <Label htmlFor="sensorImportFile">Sensor import sheet</Label>
              <button
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-950 hover:bg-white focus-visible:border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
                onClick={() => setImportPromptOpen(true)}
                type="button"
              >
                <UploadSimple className="size-6 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-950">
                  Upload CSV readings
                </span>
                <span className="text-xs text-zinc-500">
                  Attach a CSV file exported from the sensor system.
                </span>
                {selectedImportFileName ? (
                  <span className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                    {selectedImportFileName}
                  </span>
                ) : null}
              </button>
              <Input
                accept=".csv,text/csv"
                className="sr-only"
                id="sensorImportFile"
                name="sensorImportFile"
                onChange={(event) =>
                  setSelectedImportFileName(
                    event.currentTarget.files?.[0]?.name ?? "",
                  )
                }
                ref={fileInputRef}
                required={isSensorImport}
                type="file"
              />
              <Dialog
                modal="trap-focus"
                onOpenChange={setImportPromptOpen}
                open={importPromptOpen}
              >
                <DialogContent
                  className="w-[min(calc(100vw-2rem),30rem)] max-w-none gap-0 rounded-lg border-zinc-200 bg-white p-0 shadow-2xl"
                  showCloseButton={false}
                >
                  <div className="border-b border-zinc-100 px-5 py-4">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold text-zinc-950">
                        Sensor import sheet
                      </DialogTitle>
                      <DialogDescription>
                        Upload a CSV file exported from the sensor system. The
                        sheet should contain one reading per row for the selected
                        equipment.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="grid gap-3 px-5 py-4">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Required reading data
                      </p>
                      <p className="mt-2 text-sm leading-5 text-zinc-600">
                        Each row should identify the asset, show when the
                        reading was captured, and include the model input measurements:
                        product type, air temperature, process temperature,
                        rotational speed, torque, and tool wear. If asset details
                        are not in the sheet, AEGIS will use the equipment selected
                        in the form.
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Supported file type
                      </p>
                      <p className="mt-2 text-sm leading-5 text-zinc-600">
                        Use a comma-separated CSV file. Optional operating
                        context such as pressure, vibration, flow rate, and
                        operating hours can be included when available.
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="border-t border-zinc-100 px-5 py-4">
                    <DialogClose render={<Button variant="outline" />}>
                      Cancel
                    </DialogClose>
                    <Button
                      className="rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
                      onClick={() => {
                        setImportPromptOpen(false);
                        window.requestAnimationFrame(() => {
                          fileInputRef.current?.click();
                        });
                      }}
                      type="button"
                    >
                      <UploadSimple />
                      Upload CSV
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <div className="md:col-span-2">
            <Button
              className="h-11 w-full rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
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

function formatReadingResult(
  result:
    | {
        count: number;
        predictions?: {
          created: number;
          failed: number;
          skipped: number;
        };
      }
    | void,
  isSensorImport: boolean
) {
  const readingCount = result?.count ?? 1;
  const readingLabel =
    readingCount === 1
      ? "1 reading"
      : `${readingCount.toLocaleString()} readings`;
  const predictionCount = result?.predictions?.created ?? 0;
  const failedCount = result?.predictions?.failed ?? 0;

  if (failedCount > 0) {
    return `${readingLabel} saved. ${failedCount.toLocaleString()} prediction runs need review.`;
  }

  if (predictionCount > 0) {
    return `${readingLabel} saved with ${predictionCount.toLocaleString()} prediction runs.`;
  }

  return isSensorImport
    ? `${readingLabel} imported.`
    : "The operational data point was recorded.";
}

function NumberField({
  label,
  name,
  required = false,
  step,
}: {
  label: string;
  name: string;
  required?: boolean;
  step: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        className="h-11 w-full min-w-0 rounded-full border-zinc-200 bg-zinc-50 px-4"
        id={name}
        name={name}
        required={required}
        step={step}
        type="number"
      />
    </div>
  );
}
