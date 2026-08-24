"use client";

import { useMemo, useState } from "react";
import { FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DashboardAssetRow = {
  asset: string;
  category: string;
  health: number;
  name: string;
  risk: string;
  updated: string;
};

type DashboardAssetTableProps = {
  rows: DashboardAssetRow[];
};

const riskFilters = ["ALL", "HIGH", "MEDIUM", "LOW"] as const;

export function DashboardAssetTable({ rows }: DashboardAssetTableProps) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<(typeof riskFilters)[number]>("ALL");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.asset.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.category.toLowerCase().includes(normalizedQuery);
      const matchesRisk = risk === "ALL" || row.risk === risk;

      return matchesQuery && matchesRisk;
    });
  }, [query, risk, rows]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <MagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <Input
            aria-label="Search dashboard assets"
            className="h-10 rounded-full border-zinc-200 bg-zinc-50 pl-9"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1">
          <FunnelSimple aria-hidden="true" className="ml-2 size-4 text-zinc-500" />
          {riskFilters.map((item) => (
            <button
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-950",
                risk === item && "bg-white text-zinc-950 shadow-sm"
              )}
              key={item}
              onClick={() => setRisk(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50/70">
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                className="border-zinc-100 transition-colors hover:bg-zinc-50"
                key={`${row.asset}-${row.updated}`}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-zinc-950">{row.asset}</p>
                    <p className="text-xs text-zinc-500">{row.name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-600">{row.category}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                      <span
                        className="block h-full rounded-full bg-zinc-950"
                        style={{ width: `${row.health}%` }}
                      />
                    </span>
                    <span className="text-sm font-medium">{row.health}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge risk={row.risk} />
                </TableCell>
                <TableCell className="text-zinc-500">{row.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!filteredRows.length && (
        <div className="mx-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          No matching assets
        </div>
      )}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const className =
    risk === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : risk === "MEDIUM"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {risk}
    </span>
  );
}
