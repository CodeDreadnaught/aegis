import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tablePageSize, type PaginationSearchParams } from "@/lib/pagination";

export function PaginationControls({
  className,
  page,
  pageParam = "page",
  pageSize = tablePageSize,
  searchParams,
  total,
}: {
  className?: string;
  page: number;
  pageParam?: string;
  pageSize?: number;
  searchParams?: PaginationSearchParams;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);

  if (total <= pageSize) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border-t border-zinc-100 px-4 py-3 text-center text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:text-left",
        className
      )}
    >
      <p>
        Showing {start.toLocaleString()}-{end.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Link
          aria-disabled={currentPage === 1}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: cn(
              "h-10 min-w-[7.5rem] justify-center rounded-full border-zinc-200 bg-white text-zinc-700",
              currentPage === 1 && "pointer-events-none opacity-50"
            ),
          })}
          href={buildPageHref(searchParams, pageParam, currentPage - 1)}
        >
          <CaretLeft />
          Previous
        </Link>
        <span className="grid h-10 min-w-20 place-items-center rounded-full bg-zinc-50 px-3 font-semibold text-zinc-700">
          {currentPage} / {pageCount}
        </span>
        <Link
          aria-disabled={currentPage === pageCount}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: cn(
              "h-10 min-w-[7.5rem] justify-center rounded-full border-zinc-200 bg-white text-zinc-700",
              currentPage === pageCount && "pointer-events-none opacity-50"
            ),
          })}
          href={buildPageHref(searchParams, pageParam, currentPage + 1)}
        >
          Next
          <CaretRight />
        </Link>
      </div>
    </div>
  );
}

function buildPageHref(
  searchParams: PaginationSearchParams,
  pageParam: string,
  page: number
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === pageParam || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set(pageParam, String(page));
  }

  const query = params.toString();

  return query ? `?${query}` : "?";
}
