import type { Equipment } from "@/generated/prisma/client";
import Link from "next/link";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EquipmentFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref?: string;
  equipment?: Equipment;
  submitLabel: string;
};

export function EquipmentForm({
  action,
  cancelHref,
  equipment,
  submitLabel,
}: EquipmentFormProps) {
  const installationDate = equipment?.installationDate
    ? equipment.installationDate.toISOString().slice(0, 10)
    : "";

  return (
    <Card className="premium-panel">
      <CardHeader>
        <CardTitle>{equipment ? "Edit Equipment" : "Register Equipment"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="assetTag">Asset tag</Label>
            <Input id="assetTag" name="assetTag" required defaultValue={equipment?.assetTag} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={equipment?.name} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={equipment?.category ?? "PUMP"}
              id="category"
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
            <Label htmlFor="status">Status</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={equipment?.status ?? "ACTIVE"}
              id="status"
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
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" required defaultValue={equipment?.location} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" name="manufacturer" defaultValue={equipment?.manufacturer ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={equipment?.model ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input id="serialNumber" name="serialNumber" defaultValue={equipment?.serialNumber ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="installationDate">Installation date</Label>
            <Input
              defaultValue={installationDate}
              id="installationDate"
              name="installationDate"
              type="date"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={equipment?.description ?? ""} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
            <Button
              className="rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
              type="submit"
            >
              {submitLabel}
            </Button>
            {cancelHref && (
              <Link
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "rounded-full border-zinc-200 bg-white px-5 text-zinc-950 hover:bg-zinc-50",
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
