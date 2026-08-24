"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { Wrench } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="premium-panel motion-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-5 text-primary" />
          Record maintenance
        </CardTitle>
        <CardDescription>
          Capture completed work, planned work and deferred activity against a
          specific equipment record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit} ref={formRef}>
          <div className="grid gap-2">
            <Label htmlFor="equipmentId">Equipment</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            <Input
              id="type"
              name="type"
              placeholder="Inspection, preventive maintenance, corrective repair"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue="COMPLETED"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="performedAt">Performed at</Label>
              <Input
                defaultValue={today}
                id="performedAt"
                name="performedAt"
                required
                type="date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextDueDate">Next due date</Label>
              <Input id="nextDueDate" name="nextDueDate" type="date" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Summarise the work performed, observations and follow-up actions."
              required
            />
          </div>
          <Button disabled={!equipment.length || pending} type="submit">
            <Wrench />
            {pending ? "Saving maintenance" : "Save maintenance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
