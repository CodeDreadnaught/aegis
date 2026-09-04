"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  FunnelSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react";

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
  failure: number | null;
  health: number | null;
  location: string;
  name: string;
  risk: string;
  updated: string;
  updatedAt: string | null;
};

type OverviewAssetTableProps = {
  rows: OverviewAssetRow[];
};

const riskFilters = ["ALL", "HIGH", "MEDIUM", "LOW"] as const;

export function OverviewAssetTable({ rows }: OverviewAssetTableProps) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<(typeof riskFilters)[number]>("ALL");
  const [updatedDate, setUpdatedDate] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter(row => {
      const matchesQuery =
        !normalizedQuery ||
        row.asset.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.category.toLowerCase().includes(normalizedQuery) ||
        row.location.toLowerCase().includes(normalizedQuery);
      const matchesRisk = risk === "ALL" || row.risk === risk;
      const matchesUpdatedDate =
        !updatedDate || row.updatedAt === updatedDate;

      return matchesQuery && matchesRisk && matchesUpdatedDate;
    });
  }, [query, risk, rows, updatedDate]);

  const paginatedRows = paginateItems(filteredRows, page);

  return (
    <div className="grid w-full max-w-full min-w-0 gap-3">
      <div className="grid w-full max-w-full min-w-0 gap-2 px-4 lg:grid-cols-[minmax(14rem,1fr)_auto_minmax(10rem,0.45fr)] lg:items-center">
        <div className="relative min-w-0">
          <MagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          />
          <Input
            aria-label="Search overview assets"
            className="h-10 rounded-full border-zinc-200 bg-zinc-50 pl-9"
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search assets"
            value={query}
          />
        </div>
        <div className="min-w-0 max-w-full overflow-x-auto">
          <div className="flex w-full min-w-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 lg:w-max">
            <FunnelSimple
              aria-hidden="true"
              className="ml-2 size-4 shrink-0 text-zinc-500"
            />
            {riskFilters.map(item => (
              <button
                className={cn(
                  "h-8 flex-1 rounded-full px-2 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-zinc-950 sm:text-xs lg:flex-none lg:px-3",
                  risk === item && "bg-white text-zinc-950 shadow-sm",
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
        <input
          aria-label="Filter asset updates by date"
          className="h-10 w-full max-w-full min-w-0 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 shadow-inner shadow-zinc-950/5 outline-none transition-colors focus:border-zinc-950"
          onChange={event => {
            setUpdatedDate(event.target.value);
            setPage(1);
          }}
          type="date"
          value={updatedDate}
        />
      </div>

      {paginatedRows.items.length ? (
        <div className="grid px-4 pb-4 lg:hidden" data-testid="asset-performance-list">
          {paginatedRows.items.map((row, index) => (
            <div
              className="grid gap-3 border-b border-zinc-100 py-4 last:border-b-0"
              key={`mobile-${row.asset}-${row.updated}-${paginatedRows.currentPage}-${index}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {row.asset}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{row.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {row.location}
                  </p>
                </div>
                <RiskBadge risk={row.risk} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-lg bg-zinc-50 p-2">
                  <dt className="font-semibold uppercase tracking-wide text-zinc-400">
                    Category
                  </dt>
                  <dd className="mt-1 truncate font-medium text-zinc-700">
                    {row.category}
                  </dd>
                </div>
                <div className="min-w-0 rounded-lg bg-zinc-50 p-2">
                  <dt className="font-semibold uppercase tracking-wide text-zinc-400">
                    Updated
                  </dt>
                  <dd className="mt-1 truncate font-medium text-zinc-700">
                    {row.updated}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-2">
                <MobileScore
                  accentClassName="bg-[#2f9da7]"
                  label="Health"
                  value={row.health}
                />
                <MobileScore
                  accentClassName="bg-[#ef4444]"
                  label="Failure"
                  value={row.failure}
                />
              </div>

              <Link
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
                href={`/equipment/view-more/${row.assetId}`}
              >
                View asset
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      <div className="hidden max-w-full min-w-0 overflow-x-auto px-4 pb-4 lg:block" data-testid="asset-performance-table">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50/70">
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Failure</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                    {row.health === null ? (
                      <span className="text-sm text-zinc-400">Pending</span>
                    ) : (
                      <>
                        <span className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                          <span
                            className="block h-full rounded-full bg-zinc-950"
                            style={{ width: `${row.health}%` }}
                          />
                        </span>
                        <span className="text-sm font-medium">
                          {row.health}%
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {row.failure === null ? (
                      <span className="text-sm text-zinc-400">Pending</span>
                    ) : (
                      <>
                        <span className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
                          <span
                            className="block h-full rounded-full bg-red-500"
                            style={{ width: `${row.failure}%` }}
                          />
                        </span>
                        <span className="text-sm font-medium">
                          {row.failure}%
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge risk={row.risk} />
                </TableCell>
                <TableCell className="text-zinc-500">{row.updated}</TableCell>
                <TableCell className="text-right">
                  <Link
                    className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
                    href={`/equipment/view-more/${row.assetId}`}
                  >
                    View
                  </Link>
                </TableCell>
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              className="h-10 w-[7.5rem] justify-center rounded-full border-zinc-200 bg-white text-zinc-700"
              disabled={paginatedRows.currentPage === 1}
              onClick={() => setPage(value => Math.max(1, value - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              <CaretLeft />
              Previous
            </Button>
            <span className="inline-flex h-10 w-20 items-center justify-center rounded-full bg-zinc-50 px-3 py-1 font-semibold text-zinc-700">
              {paginatedRows.currentPage} / {paginatedRows.pageCount}
            </span>
            <Button
              className="h-10 w-[7.5rem] justify-center rounded-full border-zinc-200 bg-white text-zinc-700"
              disabled={paginatedRows.currentPage === paginatedRows.pageCount}
              onClick={() =>
                setPage(value => Math.min(paginatedRows.pageCount, value + 1))
              }
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

function MobileScore({
  accentClassName,
  label,
  value,
}: {
  accentClassName: string;
  label: string;
  value: number | null;
}) {
  const width = value === null ? "0%" : `${Math.min(100, Math.max(0, value))}%`;

  return (
    <div className="grid gap-1.5 rounded-lg bg-zinc-50 p-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        <span className="font-semibold text-zinc-700">
          {value === null ? "Pending" : `${value}%`}
        </span>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <span
          className={cn("block h-full rounded-full", accentClassName)}
          style={{ width }}
        />
      </span>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const className =
    risk === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : risk === "MEDIUM"
        ? "border-zinc-300 bg-zinc-100 text-zinc-800"
        : risk === "LOW"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-500";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {risk}
    </span>
  );
}
