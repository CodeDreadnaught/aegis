"use client";

import type { Equipment } from "@/generated/prisma/client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pulse, Trash, UploadSimple } from "@phosphor-icons/react";

import {
  equipmentCategories,
  equipmentStatuses,
  formatEquipmentCategory,
} from "@/features/equipment/validation";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

type EquipmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref?: string;
  equipment?: Equipment;
  submitLabel: string;
};

type ManualRow = {
  id: string;
};

export function EquipmentForm({
  action,
  cancelHref,
  equipment,
  submitLabel,
}: EquipmentFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [registrationMode, setRegistrationMode] = useState<"manual" | "sheet">(
    "manual"
  );
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: "equipment-row-1" },
  ]);
  const [initialReadingRowIds, setInitialReadingRowIds] = useState<Set<string>>(
    () => new Set()
  );
  const [importPromptOpen, setImportPromptOpen] = useState(false);
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const isCreateMode = !equipment;
  const isSheetMode = isCreateMode && registrationMode === "sheet";

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

  function addManualRow() {
    setManualRows((rows) => [
      ...rows,
      { id: `equipment-row-${Date.now()}-${rows.length}` },
    ]);
  }

  function removeManualRow(rowId: string) {
    setManualRows((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)
    );
    setInitialReadingRowIds((rowIds) => {
      const nextRowIds = new Set(rowIds);
      nextRowIds.delete(rowId);
      return nextRowIds;
    });
  }

  function toggleInitialReading(rowId: string) {
    setInitialReadingRowIds((rowIds) => {
      const nextRowIds = new Set(rowIds);

      if (nextRowIds.has(rowId)) {
        nextRowIds.delete(rowId);
      } else {
        nextRowIds.add(rowId);
      }

      return nextRowIds;
    });
  }

  return (
    <Card className="premium-panel">
      <CardHeader>
        <CardTitle>{equipment ? "Edit Equipment" : "Register Equipment"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5">
          {isCreateMode ? (
            <div className="grid gap-2">
              <Label htmlFor="registrationMode">Registration method</Label>
              <select
                className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950"
                id="registrationMode"
                name="registrationMode"
                onChange={(event) => {
                  const nextMode = event.currentTarget.value as
                    | "manual"
                    | "sheet";
                  setRegistrationMode(nextMode);
                  setImportPromptOpen(false);
                  setSelectedImportFileName("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                value={registrationMode}
              >
                <option value="manual">Manual registration</option>
                <option value="sheet">Asset Import</option>
              </select>
            </div>
          ) : null}

          {isSheetMode ? (
            <div className="grid gap-2">
              <Label htmlFor="equipmentImportFile">Asset import file</Label>
              <button
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-950 hover:bg-white focus-visible:border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
                onClick={() => setImportPromptOpen(true)}
                type="button"
              >
                <UploadSimple className="size-6 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-950">
                  Upload CSV assets
                </span>
                <span className="text-xs text-zinc-500">
                  Attach a CSV file exported from the asset inventory.
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
                id="equipmentImportFile"
                name="equipmentImportFile"
                onChange={(event) =>
                  setSelectedImportFileName(
                    event.currentTarget.files?.[0]?.name ?? ""
                  )
                }
                ref={fileInputRef}
                required={isSheetMode}
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
                        Asset Import
                      </DialogTitle>
                      <DialogDescription>
                        Upload a CSV file containing one equipment record per
                        row.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="grid gap-3 px-5 py-4">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Required equipment data
                      </p>
                      <p className="mt-2 text-sm leading-5 text-zinc-600">
                        Each row should include asset tag, equipment name,
                        category, status, and location.
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Optional metadata
                      </p>
                      <p className="mt-2 text-sm leading-5 text-zinc-600">
                        Manufacturer, model, serial number, installation date,
                        and description can be included when available.
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-sm font-semibold text-zinc-950">
                        Optional initial readings
                      </p>
                      <p className="mt-2 text-sm leading-5 text-zinc-600">
                        Include product type, temperatures, speed, torque, tool
                        wear, pressure, vibration, flow, and operating hours to
                        create telemetry during registration.
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
          ) : (
            <div className="grid gap-4">
              {isCreateMode ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-500">
                    {manualRows.length === 1
                      ? "Manual entry"
                      : `${manualRows.length} equipment entries`}
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
              ) : null}
              {(equipment ? [{ id: "equipment-edit-row" }] : manualRows).map(
                (row, index) => (
                  <div
                    className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                    key={row.id}
                  >
                    {isCreateMode && manualRows.length > 1 ? (
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-950">
                          Equipment {index + 1}
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
                    <input name="equipmentRowId" type="hidden" value={row.id} />
                    <EquipmentFields
                      equipment={equipment}
                      index={index}
                      rowId={row.id}
                    />
                    {isCreateMode ? (
                      <div className="mt-4 border-t border-zinc-100 pt-4">
                        <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <span>
                            <span className="block text-sm font-semibold text-zinc-950">
                              Add initial reading
                            </span>
                            <span className="mt-1 block text-xs font-medium text-zinc-500">
                              Capture current operating values for this asset.
                            </span>
                          </span>
                          <input
                            checked={initialReadingRowIds.has(row.id)}
                            className="size-4 accent-zinc-950"
                            name="initialReadingEnabled"
                            onChange={() => toggleInitialReading(row.id)}
                            type="checkbox"
                            value={row.id}
                          />
                        </label>
                        {initialReadingRowIds.has(row.id) ? (
                          <InitialReadingFields index={index} rowId={row.id} />
                        ) : (
                          <InitialReadingPlaceholders />
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 w-full rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
              type="submit"
            >
              {isSheetMode ? "Import equipment" : submitLabel}
            </Button>
            {cancelHref && (
              <Link
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "h-11 w-full rounded-full border-zinc-200 bg-white px-5 text-zinc-950 hover:bg-zinc-50 sm:w-auto",
                })}
                href={cancelHref}
              >
                Cancel edit
              </Link>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EquipmentFields({
  equipment,
  index,
  rowId,
}: {
  equipment?: Equipment;
  index: number;
  rowId: string;
}) {
  const installationDate = equipment?.installationDate
    ? equipment.installationDate.toISOString().slice(0, 10)
    : "";
  const suffix = `${rowId}-${index}`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`assetTag-${suffix}`}>Asset tag</Label>
        <Input
          defaultValue={equipment?.assetTag}
          id={`assetTag-${suffix}`}
          name="assetTag"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`name-${suffix}`}>Name</Label>
        <Input
          defaultValue={equipment?.name}
          id={`name-${suffix}`}
          name="name"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`category-${suffix}`}>Category</Label>
        <select
          className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950"
          defaultValue={equipment?.category ?? "PUMP"}
          id={`category-${suffix}`}
          name="category"
        >
          {equipmentCategories.map((category) => (
            <option key={category} value={category}>
              {formatEquipmentCategory(category)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`status-${suffix}`}>Status</Label>
        <select
          className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950"
          defaultValue={equipment?.status ?? "ACTIVE"}
          id={`status-${suffix}`}
          name="status"
        >
          {equipmentStatuses.map((status) => (
            <option key={status} value={status}>
              {formatEquipmentCategory(status)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`location-${suffix}`}>Location</Label>
        <Input
          defaultValue={equipment?.location}
          id={`location-${suffix}`}
          name="location"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`manufacturer-${suffix}`}>Manufacturer</Label>
        <Input
          defaultValue={equipment?.manufacturer ?? ""}
          id={`manufacturer-${suffix}`}
          name="manufacturer"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`model-${suffix}`}>Model</Label>
        <Input
          defaultValue={equipment?.model ?? ""}
          id={`model-${suffix}`}
          name="model"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`serialNumber-${suffix}`}>Serial number</Label>
        <Input
          defaultValue={equipment?.serialNumber ?? ""}
          id={`serialNumber-${suffix}`}
          name="serialNumber"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`installationDate-${suffix}`}>Installation date</Label>
        <Input
          defaultValue={installationDate}
          id={`installationDate-${suffix}`}
          name="installationDate"
          type="date"
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`description-${suffix}`}>Description</Label>
        <Textarea
          defaultValue={equipment?.description ?? ""}
          id={`description-${suffix}`}
          name="description"
        />
      </div>
    </div>
  );
}

function InitialReadingFields({
  index,
  rowId,
}: {
  index: number;
  rowId: string;
}) {
  const suffix = `initial-${rowId}-${index}`;

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
          <Pulse aria-hidden="true" className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-950">
            Initial operating reading
          </p>
          <p className="text-xs font-medium text-zinc-500">
            Used immediately for predictive analysis.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`recordedAt-${suffix}`}>Recorded at</Label>
          <Input
            defaultValue={getCurrentDateTimeLocal()}
            id={`recordedAt-${suffix}`}
            name="recordedAt"
            required
            type="datetime-local"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`type-${suffix}`}>Product type</Label>
          <select
            className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950"
            defaultValue="M"
            id={`type-${suffix}`}
            name="type"
          >
            <option value="H">Type H</option>
            <option value="L">Type L</option>
            <option value="M">Type M</option>
          </select>
        </div>
        <ReadingNumberField
          label="Air temperature (K)"
          name="airTemperatureKelvin"
          suffix={suffix}
        />
        <ReadingNumberField
          label="Process temperature (K)"
          name="processTemperatureKelvin"
          suffix={suffix}
        />
        <ReadingNumberField
          label="Rotational speed (rpm)"
          name="rotationalSpeedRpm"
          suffix={suffix}
        />
        <ReadingNumberField label="Torque (Nm)" name="torqueNm" suffix={suffix} />
        <ReadingNumberField
          label="Tool wear (min)"
          name="toolWearMinutes"
          suffix={suffix}
        />
        <ReadingNumberField
          label="Pressure (bar)"
          name="pressureBar"
          required={false}
          suffix={suffix}
        />
        <ReadingNumberField
          label="Vibration (mm/s)"
          name="vibrationMmS"
          required={false}
          suffix={suffix}
        />
        <ReadingNumberField
          label="Flow rate (bpd)"
          name="flowRateBpd"
          required={false}
          suffix={suffix}
        />
        <ReadingNumberField
          label="Operating hours"
          name="operatingHours"
          required={false}
          suffix={suffix}
        />
      </div>
    </div>
  );
}

function ReadingNumberField({
  label,
  name,
  required = true,
  suffix,
}: {
  label: string;
  name: string;
  required?: boolean;
  suffix: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}-${suffix}`}>{label}</Label>
      <Input
        id={`${name}-${suffix}`}
        inputMode="decimal"
        min="0"
        name={name}
        required={required}
        step="any"
        type="number"
      />
    </div>
  );
}

function InitialReadingPlaceholders() {
  return (
    <>
      {[
        "recordedAt",
        "type",
        "airTemperatureKelvin",
        "processTemperatureKelvin",
        "rotationalSpeedRpm",
        "torqueNm",
        "toolWearMinutes",
        "pressureBar",
        "vibrationMmS",
        "flowRateBpd",
        "operatingHours",
      ].map((name) => (
        <input key={name} name={name} type="hidden" value="" />
      ))}
    </>
  );
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
