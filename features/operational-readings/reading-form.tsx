"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Database, SpinnerGap, UploadSimple } from "@phosphor-icons/react";

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
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

type ReadingFormProps = {
  action: (formData: FormData) => Promise<{ count: number } | void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
};

export function ReadingForm({ action, equipment }: ReadingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sourceType, setSourceType] = useState("MANUAL_ENTRY");
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
        toast.success({
          title: isSensorImport ? "Readings imported" : "Reading saved",
          description:
            result?.count && result.count > 1
              ? `${result.count} sensor readings were imported.`
              : "The operational data point was recorded.",
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
          className="grid min-w-0 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <div className="grid min-w-0 gap-2 md:col-span-2">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              disabled={isSensorImport}
              id="equipmentId"
              name="equipmentId"
              required={!isSensorImport}
            >
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
              onChange={(event) => setSourceType(event.currentTarget.value)}
              value={sourceType}
            >
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {formatSourceType(sourceType)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="type">Product type</Label>
            <select
              className="h-11 w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-600 outline-none transition-colors focus:border-zinc-950"
              defaultValue="M"
              disabled={isSensorImport}
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
            disabled={isSensorImport}
            label="Air temperature (K)"
            name="airTemperatureKelvin"
            required={!isSensorImport}
            step="0.01"
          />
          <NumberField
            disabled={isSensorImport}
            label="Process temperature (K)"
            name="processTemperatureKelvin"
            required={!isSensorImport}
            step="0.01"
          />
          <NumberField
            disabled={isSensorImport}
            label="Rotational speed (rpm)"
            name="rotationalSpeedRpm"
            required={!isSensorImport}
            step="1"
          />
          <NumberField
            disabled={isSensorImport}
            label="Torque (Nm)"
            name="torqueNm"
            required={!isSensorImport}
            step="0.01"
          />
          <NumberField
            disabled={isSensorImport}
            label="Tool wear (min)"
            name="toolWearMinutes"
            required={!isSensorImport}
            step="1"
          />
          <NumberField
            disabled={isSensorImport}
            label="Pressure (bar)"
            name="pressureBar"
            step="0.01"
          />
          <NumberField
            disabled={isSensorImport}
            label="Vibration (mm/s)"
            name="vibrationMmS"
            step="0.01"
          />
          <NumberField
            disabled={isSensorImport}
            label="Flow rate (bpd)"
            name="flowRateBpd"
            step="1"
          />
          <NumberField
            disabled={isSensorImport}
            label="Operating hours"
            name="operatingHours"
            step="0.1"
          />
          {isSensorImport && (
            <div className="grid min-w-0 gap-2 md:col-span-2">
              <Label htmlFor="sensorImportFile">Sensor import sheet</Label>
              <label
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition-colors hover:border-zinc-950 hover:bg-white"
                htmlFor="sensorImportFile"
              >
                <UploadSimple className="size-6 text-zinc-500" />
                <span className="text-sm font-semibold text-zinc-950">
                  Upload CSV readings
                </span>
                <span className="text-xs text-zinc-500">
                  Include assetTag or equipmentId plus recordedAt and model input columns.
                </span>
              </label>
              <Input
                accept=".csv,text/csv"
                className="sr-only"
                id="sensorImportFile"
                name="sensorImportFile"
                required={isSensorImport}
                type="file"
              />
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

function NumberField({
  disabled = false,
  label,
  name,
  required = false,
  step,
}: {
  disabled?: boolean;
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
        disabled={disabled}
        id={name}
        name={name}
        required={required}
        step={step}
        type="number"
      />
    </div>
  );
}
