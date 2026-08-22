import { Wrench } from "@phosphor-icons/react/ssr";

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

type MaintenanceFormProps = {
  action: (formData: FormData) => Promise<void>;
  equipment: Array<{
    id: string;
    assetTag: string;
    name: string;
  }>;
};

export function MaintenanceForm({ action, equipment }: MaintenanceFormProps) {
  const today = new Date().toISOString().slice(0, 10);

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
        <form action={action} className="grid gap-4">
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
          <Button disabled={!equipment.length} type="submit">
            <Wrench />
            Save maintenance
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
