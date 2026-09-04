import { describe, expect, it } from "vitest";

import { csvDataHref, toCsv } from "@/features/reports/csv";

describe("report CSV helpers", () => {
  it("escapes comma and quote values", () => {
    expect(
      toCsv([
        {
          asset: "AEG-001",
          note: 'Inspection, "complete"',
        },
      ])
    ).toBe('asset,note\nAEG-001,"Inspection, ""complete"""');
  });

  it("builds CSV data hrefs", () => {
    expect(csvDataHref("asset\nAEG-001")).toContain("data:text/csv");
  });
});
