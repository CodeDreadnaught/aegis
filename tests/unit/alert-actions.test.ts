import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, requirePermission, revalidatePath } = vi.hoisted(() => ({
  mockPrisma: {
    alert: {
      updateManyAndReturn: vi.fn(),
    },
    auditLog: {
      createMany: vi.fn(),
    },
  },
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/server/auth/session", () => ({ requirePermission }));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));

import {
  acknowledgeAlertsAction,
  resolveAlertsAction,
} from "@/features/alerts/actions";

describe("alert actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue({ id: "admin_1" });
    mockPrisma.alert.updateManyAndReturn.mockResolvedValue([
      { equipmentId: "equipment_1", id: "alert_1", status: "ACKNOWLEDGED" },
      { equipmentId: "equipment_2", id: "alert_2", status: "ACKNOWLEDGED" },
    ]);
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 2 });
  });

  it("bulk acknowledges unique active alerts", async () => {
    const result = await acknowledgeAlertsAction([
      "alert_1",
      "alert_2",
      "alert_1",
      " ",
    ]);

    expect(result).toEqual({ count: 2 });
    expect(requirePermission).toHaveBeenCalledWith("manageAlerts");
    expect(mockPrisma.alert.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: { in: ["alert_1", "alert_2"] },
        status: "ACTIVE",
      },
      data: {
        acknowledgedAt: expect.any(Date),
        acknowledgedById: "admin_1",
        status: "ACKNOWLEDGED",
      },
      select: {
        equipmentId: true,
        id: true,
        status: true,
      },
    });
    expect(mockPrisma.auditLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          action: "ACKNOWLEDGE_ALERT",
          entityId: "alert_1",
          entityType: "Alert",
          metadata: {
            bulk: true,
            equipmentId: "equipment_1",
            status: "ACKNOWLEDGED",
          },
          userId: "admin_1",
        },
        {
          action: "ACKNOWLEDGE_ALERT",
          entityId: "alert_2",
          entityType: "Alert",
          metadata: {
            bulk: true,
            equipmentId: "equipment_2",
            status: "ACKNOWLEDGED",
          },
          userId: "admin_1",
        },
      ],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/alerts");
  });

  it("bulk resolves selected unresolved alerts", async () => {
    mockPrisma.alert.updateManyAndReturn.mockResolvedValueOnce([
      { equipmentId: "equipment_1", id: "alert_1", status: "RESOLVED" },
    ]);

    const result = await resolveAlertsAction(["alert_1"]);

    expect(result).toEqual({ count: 1 });
    expect(mockPrisma.alert.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: { in: ["alert_1"] },
        status: { not: "RESOLVED" },
      },
      data: {
        resolvedAt: expect.any(Date),
        status: "RESOLVED",
      },
      select: {
        equipmentId: true,
        id: true,
        status: true,
      },
    });
    expect(mockPrisma.auditLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          action: "RESOLVE_ALERT",
          entityId: "alert_1",
          entityType: "Alert",
          metadata: {
            bulk: true,
            equipmentId: "equipment_1",
            status: "RESOLVED",
          },
          userId: "admin_1",
        },
      ],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/alerts");
  });

  it("rejects bulk updates without selected alerts", async () => {
    await expect(acknowledgeAlertsAction([])).rejects.toThrow(
      "Select at least one alert to acknowledge.",
    );
    await expect(resolveAlertsAction([" "])).rejects.toThrow(
      "Select at least one alert to resolve.",
    );

    expect(mockPrisma.alert.updateManyAndReturn).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.createMany).not.toHaveBeenCalled();
  });
});