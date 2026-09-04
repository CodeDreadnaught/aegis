import { describe, expect, it } from "vitest";

import { paginateItems, parsePageParam, tablePageSize } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("uses ten records per page", () => {
    expect(tablePageSize).toBe(10);
  });

  it("returns the requested page slice and metadata", () => {
    const result = paginateItems(Array.from({ length: 25 }, (_, index) => index + 1), 2);

    expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.currentPage).toBe(2);
    expect(result.pageCount).toBe(3);
    expect(result.total).toBe(25);
  });

  it("clamps invalid and out-of-range pages", () => {
    expect(parsePageParam("bad")).toBe(1);
    expect(parsePageParam(["3"])).toBe(3);
    expect(paginateItems([1, 2, 3], 99).currentPage).toBe(1);
  });
});
