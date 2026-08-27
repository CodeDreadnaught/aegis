import { describe, expect, it } from "vitest";

import { getNavigationItems } from "@/components/app-shell/navigation";
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

  it("keeps administrator-only equipment actions away from non-admin roles", () => {
    expect(can("ADMINISTRATOR", "createEquipment")).toBe(true);
    expect(can("ADMINISTRATOR", "updateEquipment")).toBe(true);
    expect(can("ADMINISTRATOR", "deleteEquipment")).toBe(true);
    expect(can("MAINTENANCE_ENGINEER", "createEquipment")).toBe(false);
    expect(can("OPERATIONS_MANAGER", "createEquipment")).toBe(false);
    expect(can("OPERATIONS_MANAGER", "updateEquipment")).toBe(false);
  });

  it("hides role-inaccessible navigation entries", () => {
    const administratorNav = getNavigationItems("ADMINISTRATOR").map(
      (item) => item.href
    );
    const maintenanceNav = getNavigationItems("MAINTENANCE_ENGINEER").map(
      (item) => item.href
    );
    const operationsNav = getNavigationItems("OPERATIONS_MANAGER").map(
      (item) => item.href
    );

    expect(administratorNav).toContain("/users");
    expect(administratorNav).toContain("/audit");
    expect(administratorNav).toContain("/alerts");
    expect(maintenanceNav).toContain("/alerts");
    expect(maintenanceNav).not.toContain("/users");
    expect(maintenanceNav).not.toContain("/audit");
    expect(operationsNav).not.toContain("/alerts");
    expect(operationsNav).not.toContain("/users");
    expect(operationsNav).not.toContain("/audit");
  });

  it("allows operations managers to view maintenance but not record it", () => {
    expect(can("OPERATIONS_MANAGER", "viewMaintenance")).toBe(true);
    expect(can("OPERATIONS_MANAGER", "recordMaintenance")).toBe(false);
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
