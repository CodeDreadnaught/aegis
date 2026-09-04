import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, revalidatePath, requirePermission } = vi.hoisted(() => ({
  mockPrisma: {
    auditLog: {
      createMany: vi.fn(),
    },
    equipment: {
      findMany: vi.fn(),
    },
    maintenanceRecord: {
      createManyAndReturn: vi.fn(),
      findMany: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/server/auth/session", () => ({ requirePermission }));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));

describe("maintenance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue({ id: "engineer_1" });
    mockPrisma.equipment.findMany.mockResolvedValue([
      { assetTag: "XTR-001", id: "equipment_1" },
    ]);
    mockPrisma.maintenanceRecord.findMany.mockResolvedValue([]);
    mockPrisma.maintenanceRecord.createManyAndReturn.mockResolvedValue([
      {
        equipmentId: "equipment_1",
        id: "maintenance_1",
        status: "COMPLETED",
      },
    ]);
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 1 });
  });

  it("imports maintenance rows once and reports created records", async () => {
    const { createMaintenanceRecordAction } = await import(
      "@/features/maintenance/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,type,description,performedAt,nextDueDate,status",
      "XTR-001,Inspection,Routine tree inspection completed,2026-08-20,2026-11-20,COMPLETED",
    ].join("\n");

    formData.set("entryMode", "sheet");
    formData.set("maintenanceImportFile", new File([csv], "maintenance.csv", { type: "text/csv" }));

    await expect(createMaintenanceRecordAction(formData)).resolves.toMatchObject({
      count: 1,
      processed: 1,
      skippedDuplicates: 0,
    });
    expect(mockPrisma.maintenanceRecord.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          description: "Routine tree inspection completed",
          equipmentId: "equipment_1",
          recordedById: "engineer_1",
          type: "Inspection",
        }),
      ],
      skipDuplicates: true,
      select: {
        equipmentId: true,
        id: true,
        status: true,
      },
    });
    expect(mockPrisma.auditLog.createMany).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/maintenance");
  });

  it("skips duplicate maintenance rows by equipment, type, performed date, and description", async () => {
    mockPrisma.maintenanceRecord.findMany.mockResolvedValueOnce([
      {
        description: "Routine tree inspection completed",
        equipmentId: "equipment_1",
        performedAt: new Date("2026-08-20T00:00:00.000Z"),
        type: "Inspection",
      },
    ]);
    const { createMaintenanceRecordAction } = await import(
      "@/features/maintenance/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,type,description,performedAt,status",
      "XTR-001,Inspection,Routine tree inspection completed,2026-08-20,COMPLETED",
    ].join("\n");

    formData.set("entryMode", "sheet");
    formData.set("maintenanceImportFile", new File([csv], "maintenance.csv", { type: "text/csv" }));

    await expect(createMaintenanceRecordAction(formData)).resolves.toMatchObject({
      count: 0,
      processed: 1,
      skippedDuplicates: 1,
    });
    expect(mockPrisma.maintenanceRecord.createManyAndReturn).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.createMany).not.toHaveBeenCalled();
  });
});