"use client";

import Link from "next/link";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight, FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paginateItems, tablePageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export type OverviewAssetRow = {
  asset: string;
  assetId: string;
  category: string;
  failure: number;
  health: number;
  location: string;
  name: string;
  risk: string;
  updated: string;
};

type OverviewAssetTableProps = {
  rows: OverviewAssetRow[];
};

const riskFilters = ["ALL", "HIGH", "MEDIUM", "LOW"] as const;

export function OverviewAssetTable({ rows }: OverviewAssetTableProps) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<(typeof riskFilters)[number]>("ALL");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.asset.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.category.toLowerCase().includes(normalizedQuery) ||
        row.location.toLowerCase().includes(normalizedQuery);
      const matchesRisk = risk === "ALL" || row.risk === risk;

      return matchesQuery && matchesRisk;
    });
  }, [query, risk, rows]);

  const paginatedRows = paginateItems(filteredRows, page);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <MagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <Input
            aria-label="Search overview assets"
            className="h-10 rounded-full border-zinc-200 bg-zinc-50 pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
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
              onClick={() => {
                setRisk(item);
                setPage(1);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50/70">
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Failure</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.items.map((row, index) => (
              <TableRow
                className="border-zinc-100 transition-colors hover:bg-zinc-50"
                key={`${row.asset}-${row.updated}-${paginatedRows.currentPage}-${index}`}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-zinc-950">{row.asset}</p>
                    <p className="text-xs text-zinc-500">{row.name}</p>
                    <p className="text-xs text-zinc-400">{row.location}</p>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500">{row.category}</TableCell>
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
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
                      <span
                        className="block h-full rounded-full bg-red-500"
                        style={{ width: `${row.failure}%` }}
                      />
                    </span>
                    <span className="text-sm font-medium">{row.failure}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge risk={row.risk} />
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
                    href={`/equipment/view-more/${row.assetId}`}
                  >
                    View
                  </Link>
                </TableCell>
                <TableCell className="text-zinc-500">{row.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filteredRows.length > tablePageSize && (
        <div className="flex flex-col items-center gap-3 border-t border-zinc-100 px-4 py-3 text-center text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            Showing {((paginatedRows.currentPage - 1) * tablePageSize + 1).toLocaleString()}-{Math.min(filteredRows.length, paginatedRows.currentPage * tablePageSize).toLocaleString()} of {filteredRows.length.toLocaleString()}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              className="rounded-full border-zinc-200 bg-white text-zinc-700"
              disabled={paginatedRows.currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              <CaretLeft />
              Previous
            </Button>
            <span className="rounded-full bg-zinc-50 px-3 py-1 font-semibold text-zinc-700">
              {paginatedRows.currentPage} / {paginatedRows.pageCount}
            </span>
            <Button
              className="rounded-full border-zinc-200 bg-white text-zinc-700"
              disabled={paginatedRows.currentPage === paginatedRows.pageCount}
              onClick={() => setPage((value) => Math.min(paginatedRows.pageCount, value + 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
              <CaretRight />
            </Button>
          </div>
        </div>
      )}
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
