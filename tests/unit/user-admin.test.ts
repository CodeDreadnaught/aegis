import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  deleteUserSchema,
  isRemovingActiveAdministrator,
  updateUserAccessSchema,
  userInitials,
} from "@/features/users/validation";

describe("AEGIS user administration helpers", () => {
  it("normalises valid user creation input", () => {
    const result = createUserSchema.parse({
      name: "  Ada Okoro ",
      email: " ADA.OKORO@AEGIS.DEMO ",
      password: "ChangeMe12345!",
      role: "MAINTENANCE_ENGINEER",
      status: "ACTIVE",
    });

    expect(result).toMatchObject({
      name: "Ada Okoro",
      email: "ada.okoro@aegis.demo",
      role: "MAINTENANCE_ENGINEER",
      status: "ACTIVE",
    });
  });

  it("rejects weak user creation input", () => {
    expect(() =>
      createUserSchema.parse({
        name: "A",
        email: "invalid",
        password: "short",
        role: "ADMINISTRATOR",
        status: "ACTIVE",
      })
    ).toThrow();
  });

  it("validates delete user input", () => {
    expect(deleteUserSchema.parse({ userId: "user_123" })).toEqual({
      userId: "user_123",
    });
  });

  it("validates role and status update input", () => {
    expect(
      updateUserAccessSchema.parse({
        userId: "user_123",
        role: "OPERATIONS_MANAGER",
        status: "DISABLED",
      })
    ).toEqual({
      userId: "user_123",
      role: "OPERATIONS_MANAGER",
      status: "DISABLED",
    });
  });

  it("detects removal of an active administrator", () => {
    expect(
      isRemovingActiveAdministrator(
        "ADMINISTRATOR",
        "ACTIVE",
        "OPERATIONS_MANAGER",
        "ACTIVE"
      )
    ).toBe(true);
    expect(
      isRemovingActiveAdministrator(
        "ADMINISTRATOR",
        "ACTIVE",
        "ADMINISTRATOR",
        "DISABLED"
      )
    ).toBe(true);
    expect(
      isRemovingActiveAdministrator(
        "MAINTENANCE_ENGINEER",
        "ACTIVE",
        "ADMINISTRATOR",
        "ACTIVE"
      )
    ).toBe(false);
  });

  it("creates compact initials without exposing sensitive fields", () => {
    expect(userInitials("Ada Chika Okoro")).toBe("AC");
    expect(userInitials("  admin  ")).toBe("A");
  });
});
