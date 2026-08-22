import { describe, expect, it } from "vitest";

import {
  equipmentSchema,
  formatEquipmentCategory,
} from "@/features/equipment/validation";

describe("equipment validation", () => {
  it("accepts a valid equipment input", () => {
    const input = equipmentSchema.parse({
      assetTag: "AEG-PMP-100",
      name: "Injection Pump",
      category: "PUMP",
      status: "ACTIVE",
      location: "Demo Flow Station",
      installationDate: "2024-01-15",
    });

    expect(input.assetTag).toBe("AEG-PMP-100");
    expect(input.installationDate).toBeInstanceOf(Date);
  });

  it("rejects unsupported categories", () => {
    expect(() =>
      equipmentSchema.parse({
        assetTag: "AEG-001",
        name: "Unsupported",
        category: "DRONE",
        location: "Demo",
      })
    ).toThrow();
  });

  it("formats enum values for display", () => {
    expect(formatEquipmentCategory("CHRISTMAS_TREE")).toBe("Christmas Tree");
  });
});
