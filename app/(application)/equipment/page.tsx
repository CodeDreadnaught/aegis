import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MagnifyingGlass,
  Plus,
  Wrench,
} from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEquipmentList } from "@/features/equipment/queries";
import { formatEquipmentCategory } from "@/features/equipment/validation";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AEGIS - Equipment",
};

type EquipmentPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function EquipmentPage({
  searchParams,
}: EquipmentPageProps) {
  await requirePermission("viewEquipment");
  const params = await searchParams;
  const query = params?.q ?? "";
  const equipment = await getEquipmentList(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          description="Search, register and maintain upstream equipment records while keeping operational data, maintenance history and prediction evidence attached to each asset."
          eyebrow="Asset register"
          title="Equipment Management"
        />
        <Link
          className={buttonVariants({
            className: "w-full sm:w-fit",
          })}
          href="/equipment/new"
        >
          <Plus />
          Register equipment
        </Link>
      </div>

      <Card className="premium-panel motion-card">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            Equipment register
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <form
            action="/equipment"
            className="flex flex-col gap-3 border-b p-4 sm:flex-row"
          >
            <label className="sr-only" htmlFor="q">
              Search equipment
            </label>
            <div className="relative flex-1">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={query}
                id="q"
                name="q"
                placeholder="Search by tag, name or location"
              />
            </div>
            <button
              className={buttonVariants({
                variant: "outline",
                className: "sm:w-28",
              })}
              type="submit"
            >
              Search
            </button>
          </form>

          {equipment.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id} className="group data-row">
                    <TableCell className="pl-6">
                      <div className="font-medium text-foreground">
                        {item.assetTag}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatEquipmentCategory(item.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.status === "ACTIVE"
                            ? "bg-emerald-600 text-white"
                            : undefined
                        }
                        variant={
                          item.status === "ACTIVE" ? "default" : "outline"
                        }
                      >
                        {formatEquipmentCategory(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Link
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                        })}
                        href={`/equipment/${item.id}`}
                      >
                        Details
                        <ArrowRight />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-primary">
                <Wrench className="size-6" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                No equipment found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Register the first supported asset or adjust the search term to
                locate an existing equipment record.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
