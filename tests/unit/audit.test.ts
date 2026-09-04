import { describe, expect, it } from "vitest";

import {
  formatAuditAction,
  safeMetadataSummary,
} from "@/features/audit/formatting";

describe("audit helpers", () => {
  it("formats audit action labels", () => {
    expect(formatAuditAction("CREATE_OPERATIONAL_READING")).toBe(
      "Create Operational Reading"
    );
  });

  it("redacts sensitive metadata keys", () => {
    expect(
      safeMetadataSummary({
        passwordHash: "secret",
        tokenHash: "secret",
        role: "ADMINISTRATOR",
      })
    ).toBe("role: ADMINISTRATOR");
  });

  it("reports fully sensitive metadata as redacted", () => {
    expect(safeMetadataSummary({ sessionToken: "secret" })).toBe(
      "Metadata redacted"
    );
  });
});
