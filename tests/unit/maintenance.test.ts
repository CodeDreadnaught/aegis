import { describe, expect, it } from "vitest";

import {
  formatMaintenanceStatus,
  isOverdue,
  maintenanceRecordSchema,
} from "@/features/maintenance/validation";

describe("maintenance validation", () => {
  it("normalises valid maintenance records", () => {
    const input = maintenanceRecordSchema.parse({
      equipmentId: "equipment_123",
      type: " Preventive maintenance ",
      description: "Quarterly service and inspection completed.",
      performedAt: "2026-08-22",
      nextDueDate: "",
      status: "COMPLETED",
    });

    expect(input.type).toBe("Preventive maintenance");
    expect(input.performedAt).toBeInstanceOf(Date);
    expect(input.nextDueDate).toBeUndefined();
  });

  it("rejects incomplete maintenance records", () => {
    expect(() =>
      maintenanceRecordSchema.parse({
        equipmentId: "",
        type: "A",
        description: "Bad",
        performedAt: "not-a-date",
        status: "COMPLETED",
      })
    ).toThrow();
  });

  it("formats status labels and detects overdue dates", () => {
    expect(formatMaintenanceStatus("IN_PROGRESS")).toBe("In Progress");
    expect(isOverdue(new Date("2026-01-01"), new Date("2026-08-22"))).toBe(
      true
    );
    expect(isOverdue(undefined)).toBe(false);
  });
});
