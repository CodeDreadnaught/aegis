"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { Database, SpinnerGap } from "@phosphor-icons/react";

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
  action: (formData: FormData) => Promise<void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
};

export function ReadingForm({ action, equipment }: ReadingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const now = new Date().toISOString().slice(0, 16);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
        formRef.current?.reset();
        toast.success({
          title: "Reading saved",
          description: "The operational data point was recorded.",
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
              id="equipmentId"
              name="equipmentId"
              required
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
              id="recordedAt"
              name="recordedAt"
              required
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
              {pending ? "Saving reading" : "Save reading"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
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
