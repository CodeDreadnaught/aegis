import { describe, expect, it } from "vitest";

import { can } from "@/server/auth/permissions";
import { loginSchema } from "@/features/auth/validation";
import { hashSessionToken } from "@/server/auth/tokens";

describe("AEGIS auth domain", () => {
  it("allows only administrators to manage users", () => {
    expect(can("ADMINISTRATOR", "manageUsers")).toBe(true);
    expect(can("MAINTENANCE_ENGINEER", "manageUsers")).toBe(false);
    expect(can("OPERATIONS_MANAGER", "manageUsers")).toBe(false);
  });

  it("allows maintenance engineers to record maintenance but not delete equipment", () => {
    expect(can("MAINTENANCE_ENGINEER", "recordMaintenance")).toBe(true);
    expect(can("MAINTENANCE_ENGINEER", "deleteEquipment")).toBe(false);
  });

  it("normalises valid login input", () => {
    const result = loginSchema.parse({
      email: "  ADMIN@AEGIS.DEMO ",
      password: "ChangeMe123!",
    });

    expect(result.email).toBe("admin@aegis.demo");
  });

  it("rejects invalid login input", () => {
    expect(() =>
      loginSchema.parse({ email: "not-an-email", password: "short" })
    ).toThrow();
  });

  it("hashes session tokens with the configured session secret", () => {
    const previousSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "test-session-secret-with-enough-length";

    expect(hashSessionToken("token-a")).toHaveLength(64);
    expect(hashSessionToken("token-a")).not.toBe(hashSessionToken("token-b"));
    process.env.SESSION_SECRET = previousSecret;
  });
});
