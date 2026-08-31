export const tablePageSize = 10;

export type PaginationSearchParams = Record<string, string | string[] | undefined> | undefined;

export function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function paginateItems<T>(items: T[], page: number, pageSize = tablePageSize) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    items: items.slice(start, start + pageSize),
    pageCount,
    pageSize,
    total: items.length,
  };
}