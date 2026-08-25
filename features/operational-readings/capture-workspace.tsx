"use client";

import { useMemo, useState } from "react";
import { Waveform } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadingForm } from "@/features/operational-readings/reading-form";

type EquipmentOption = {
  id: string;
  assetTag: string;
  name: string;
};

type SignalReading = {
  assetTag: string;
  equipmentId: string;
  name: string;
  parameters: {
    flowRateBpd?: number;
    pressureBar?: number;
    vibrationMmS?: number;
  };
};

type CaptureWorkspaceProps = {
  action: (formData: FormData) => Promise<{ count: number } | void>;
  equipment: EquipmentOption[];
  signals: SignalReading[];
};

export function CaptureWorkspace({
  action,
  equipment,
  signals,
}: CaptureWorkspaceProps) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(
    equipment[0]?.id ?? "",
  );
  const selectedEquipment = equipment.find(
    (item) => item.id === selectedEquipmentId,
  );
  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.equipmentId === selectedEquipmentId),
    [selectedEquipmentId, signals],
  );
  const assetLabel = selectedEquipment
    ? `${selectedEquipment.assetTag} - ${selectedEquipment.name}`
    : "No equipment selected";

  return (
    <section className="grid min-w-0 items-start gap-4 2xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <Card
        className="h-fit min-w-0 rounded-lg border-zinc-200 bg-white shadow-sm"
        data-motion="metric"
      >
        <CardHeader className="pb-1">
          <CardTitle>Latest Signal</CardTitle>
          <p className="mt-1 truncate text-sm font-medium text-zinc-500">
            {assetLabel}
          </p>
        </CardHeader>
        <CardContent className="grid gap-2.5">
          <SignalTile
            label="Vibration"
            unit="mm/s"
            value={selectedSignal?.parameters.vibrationMmS}
          />
          <SignalTile
            label="Pressure"
            unit="bar"
            value={selectedSignal?.parameters.pressureBar}
          />
          <SignalTile
            label="Flow"
            unit="bpd"
            value={selectedSignal?.parameters.flowRateBpd}
          />
        </CardContent>
      </Card>
      <ReadingForm
        action={action}
        equipment={equipment}
        onEquipmentChange={setSelectedEquipmentId}
        selectedEquipmentId={selectedEquipmentId}
      />
    </section>
  );
}

function SignalTile({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number | undefined;
}) {
  const hasValue = typeof value === "number" && Number.isFinite(value);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_12px_34px_rgba(24,24,27,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_44px_rgba(24,24,27,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{label}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">Live telemetry</p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
          <Waveform aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold leading-none text-zinc-950">
          {hasValue ? value.toLocaleString("en-GB") : "N/A"}
          {hasValue ? (
            <span className="ml-2 align-baseline text-sm font-semibold text-zinc-500">
              {unit}
            </span>
          ) : null}
        </p>
        <span className="flex h-8 items-end gap-1" aria-hidden="true">
          {[36, 68, 48, 82, 56].map((height, index) => (
            <span
              className="w-1 rounded-full bg-zinc-950/70"
              key={height}
              style={{
                height: `${hasValue ? height : 18 + index * 3}%`,
                opacity: hasValue ? 0.35 + index * 0.11 : 0.16,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
