"use client";

import type { Equipment } from "@/generated/prisma/client";
import type { EquipmentCategory } from "@/generated/prisma/enums";
import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus, Pulse, SpinnerGap, Trash } from "@phosphor-icons/react";

import {
  equipmentCategories,
  equipmentStatuses,
  formatEquipmentCategory,
} from "@/features/equipment/validation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getTelemetryRule,
  telemetryFieldNames,
  type TelemetryFieldName,
} from "@/features/operational-readings/telemetry-rules";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getActionErrorMessage } from "@/lib/action-error";
import { isNextRedirectError } from "@/lib/next-action-errors";
import { toast } from "@/components/ui/toast";

const ImportPreviewField = dynamic(() =>
  import("@/features/imports/import-preview-field").then(
    (module) => module.ImportPreviewField
  )
);

type EquipmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref?: string;
  equipment?: Equipment;
  submitLabel: string;
};

type ManualRow = {
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

export function EquipmentForm({
  action,
  cancelHref,
  equipment,
  submitLabel,
}: EquipmentFormProps) {
  const [pending, startTransition] = useTransition();
  const [registrationMode, setRegistrationMode] = useState<"manual" | "sheet">(
    "manual"
  );
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: "equipment-row-1" },
  ]);
  const [initialReadingRowIds, setInitialReadingRowIds] = useState<Set<string>>(
    () => new Set()
  );
  const [manualRowCategories, setManualRowCategories] = useState<
    Record<string, EquipmentCategory>
  >(() => ({ "equipment-row-1": "PUMP" }));
  const isCreateMode = !equipment;
  const isSheetMode = isCreateMode && registrationMode === "sheet";

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
    setManualRowCategories((categories) => {
      const nextCategories = { ...categories };
      delete nextCategories[rowId];
      return nextCategories;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
      } catch (error) {
        if (isNextRedirectError(error)) {
          throw error;
        }

        toast.error({
          title: isSheetMode ? "Equipment import failed" : "Equipment was not saved",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <Card className="premium-panel">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>{equipment ? "Edit Equipment" : "Register Equipment"}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form aria-busy={pending} className="grid gap-5" onSubmit={handleSubmit}>
                    <fieldset className="contents" disabled={pending}>
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
                }}
                value={registrationMode}
              >
                <option value="manual">Manual registration</option>
                <option value="sheet">Asset Import</option>
              </select>
            </div>
          ) : null}

          {isSheetMode ? (
            <ImportPreviewField kind="equipment" />
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
                      category={manualRowCategories[row.id] ?? equipment?.category ?? "PUMP"}
                      equipment={equipment}
                      index={index}
                      onCategoryChange={(category) =>
                        setManualRowCategories((categories) => ({
                          ...categories,
                          [row.id]: category,
                        }))
                      }
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
                          <InitialReadingFields
                            category={manualRowCategories[row.id] ?? "PUMP"}
                            index={index}
                            rowId={row.id}
                          />
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

          </fieldset>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 w-full rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <>
                  <SpinnerGap aria-hidden="true" className="size-4 animate-spin" />
                  {isSheetMode ? "Importing equipment..." : "Saving equipment..."}
                </>
              ) : isSheetMode ? (
                "Import equipment"
              ) : (
                submitLabel
              )}
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
  category,
  equipment,
  index,
  onCategoryChange,
  rowId,
}: {
  category: EquipmentCategory;
  equipment?: Equipment;
  index: number;
  onCategoryChange?: (category: EquipmentCategory) => void;
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
          id={`category-${suffix}`}
          name="category"
          onChange={(event) =>
            onCategoryChange?.(event.currentTarget.value as EquipmentCategory)
          }
          value={category}
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
  category,
  index,
  rowId,
}: {
  category: EquipmentCategory;
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
        {telemetryFieldNames.map((field) => {
          const config = readingFieldConfigs[field];
          const rule = getTelemetryRule(category, field);

          if (rule.applicability === "NOT_APPLICABLE") {
            return rule.modelDefault === undefined ? null : (
              <input key={field} name={field} type="hidden" value={rule.modelDefault} />
            );
          }

          return (
            <ReadingNumberField
              key={field}
              label={config.label}
              name={field}
              min={rule.applicability === "REQUIRED_POSITIVE" ? "0.000001" : "0"}
              required={rule.applicability.startsWith("REQUIRED")}
              step={config.step}
              suffix={suffix}
            />
          );
        })}
      </div>
    </div>
  );
}

function ReadingNumberField({
  label,
  name,
  min,
  required = true,
  step = "any",
  suffix,
}: {
  label: string;
  name: string;
  min?: string;
  required?: boolean;
  step?: string;
  suffix: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}-${suffix}`}>{label}</Label>
      <Input
        id={`${name}-${suffix}`}
        inputMode="decimal"
        min={min}
        name={name}
        required={required}
        step={step}
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
