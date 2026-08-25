"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { SpinnerGap, Wrench } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMaintenanceStatus,
  maintenanceStatuses,
} from "@/features/maintenance/validation";
import { getActionErrorMessage } from "@/lib/action-error";
import { toast } from "@/components/ui/toast";

type MaintenanceFormProps = {
  action: (formData: FormData) => Promise<void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
};

export function MaintenanceForm({ action, equipment }: MaintenanceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        await action(new FormData(form));
        formRef.current?.reset();
        toast.success({
          title: "Maintenance saved",
          description: "The maintenance record was added.",
        });
      } catch (error) {
        toast.error({
          title: "Maintenance was not saved",
          description: getActionErrorMessage(error),
        });
      }
    });
  }

  return (
    <Card
      className="h-fit rounded-lg border-zinc-200 bg-white shadow-sm"
      data-motion="panel"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wrench className="size-5 text-zinc-500" />
          Record maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form className="grid gap-3" onSubmit={handleSubmit} ref={formRef}>
          <div className="grid gap-2">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
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

          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              id="type"
              name="type"
              required
            >
              <option value="Inspection">Inspection</option>
              <option value="Preventive maintenance">
                Preventive maintenance
              </option>
              <option value="Corrective repair">Corrective repair</option>
              <option value="Lubrication">Lubrication</option>
              <option value="Calibration">Calibration</option>
              <option value="Replacement">Replacement</option>
              <option value="Safety check">Safety check</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              className="h-11 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-xs outline-none transition-colors focus:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              defaultValue="COMPLETED"
              disabled={pending}
              id="status"
              name="status"
            >
              {maintenanceStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatMaintenanceStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
            <div className="grid gap-2">
              <Label htmlFor="performedAt">Performed</Label>
              <Input
                className="h-11 rounded-full border-zinc-200 bg-zinc-50 px-4"
                defaultValue={today}
                disabled={pending}
                id="performedAt"
                name="performedAt"
                required
                type="date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextDueDate">Next due</Label>
              <Input
                className="h-11 rounded-full border-zinc-200 bg-zinc-50 px-4"
                disabled={pending}
                id="nextDueDate"
                name="nextDueDate"
                type="date"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              className="min-h-28 rounded-lg border-zinc-200 bg-zinc-50 px-4 py-3"
              disabled={pending}
              id="description"
              name="description"
              placeholder="Work notes and follow-up actions"
              required
            />
          </div>

          <Button
            className="mt-1 h-11 w-full rounded-full bg-zinc-950 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!equipment.length || pending}
            type="submit"
          >
            {pending ? <SpinnerGap className="animate-spin" /> : <Wrench />}
            {pending ? "Saving" : "Save maintenance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
