import { describe, expect, it } from "vitest";

import {
  alertSeverityClass,
  formatAlertLabel,
} from "@/features/alerts/formatting";

describe("alert display helpers", () => {
  it("formats enum labels", () => {
    expect(formatAlertLabel("ACKNOWLEDGED")).toBe("Acknowledged");
  });

  it("maps critical severity to an explicit text class", () => {
    expect(alertSeverityClass("CRITICAL")).toContain("text-red-700");
  });
});
