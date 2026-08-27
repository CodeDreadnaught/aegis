import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPredictionsForReadings, mockPrisma, redirect, requirePermission } =
  vi.hoisted(() => ({
    createPredictionsForReadings: vi.fn(),
    redirect: vi.fn(),
    requirePermission: vi.fn(),
    mockPrisma: {
      alert: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      equipment: {
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
      },
      maintenanceRecord: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      operationalReading: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      prediction: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      predictionJob: {
        deleteMany: vi.fn(),
      },
      recommendation: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/server/auth/session", () => ({ requirePermission }));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-service", () => ({
  createPredictionsForReadings,
}));

import {
  createEquipmentAction,
  deleteEquipmentWithDependencies,
} from "@/features/equipment/actions";

describe("equipment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.equipment.findUnique.mockResolvedValue({
      assetTag: "REAL-PMP-001",
      id: "equipment_1",
      name: "Injection Pump",
    });
    mockPrisma.operationalReading.findMany.mockResolvedValue([
      { id: "reading_1" },
    ]);
    mockPrisma.prediction.findMany.mockResolvedValue([{ id: "prediction_1" }]);
    mockPrisma.alert.findMany.mockResolvedValue([{ id: "alert_1" }]);
    mockPrisma.maintenanceRecord.findMany.mockResolvedValue([
      { id: "maintenance_1" },
    ]);
    mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.recommendation.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.alert.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.predictionJob.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.prediction.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.operationalReading.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.maintenanceRecord.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.equipment.delete.mockResolvedValue({ id: "equipment_1" });
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
    mockPrisma.$transaction.mockImplementation(async (operations) =>
      Promise.all(operations)
    );
    mockPrisma.equipment.create.mockResolvedValue({ id: "equipment_1" });
    mockPrisma.operationalReading.create.mockResolvedValue({
      equipmentId: "equipment_1",
      id: "reading_1",
    });
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 1 });
    createPredictionsForReadings.mockResolvedValue([
      {
        created: true,
        equipmentId: "equipment_1",
        predictionId: "prediction_1",
      },
    ]);
    requirePermission.mockResolvedValue({
      id: "admin_1",
      role: "ADMINISTRATOR",
    });
  });

  it("removes dependent records before deleting equipment", async () => {
    await deleteEquipmentWithDependencies("equipment_1", "admin_1");

    expect(mockPrisma.recommendation.deleteMany).toHaveBeenCalledWith({
      where: { predictionId: { in: ["prediction_1"] } },
    });
    expect(mockPrisma.alert.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { equipmentId: "equipment_1" },
          { predictionId: { in: ["prediction_1"] } },
        ],
      },
    });
    expect(mockPrisma.predictionJob.deleteMany).toHaveBeenCalledWith({
      where: { operationalReadingId: { in: ["reading_1"] } },
    });
    expect(mockPrisma.equipment.delete).toHaveBeenCalledWith({
      where: { id: "equipment_1" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "DELETE_EQUIPMENT",
        entityId: "equipment_1",
        entityType: "Equipment",
        metadata: {
          assetTag: "REAL-PMP-001",
          name: "Injection Pump",
        },
        userId: "admin_1",
      },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      mockPrisma.prediction.deleteMany.mock.invocationCallOrder[0]
    ).toBeLessThan(mockPrisma.equipment.delete.mock.invocationCallOrder[0]);
    expect(
      mockPrisma.maintenanceRecord.deleteMany.mock.invocationCallOrder[0]
    ).toBeLessThan(mockPrisma.equipment.delete.mock.invocationCallOrder[0]);
  });

  it("rejects deleting missing equipment", async () => {
    mockPrisma.equipment.findUnique.mockResolvedValueOnce(null);

    await expect(
      deleteEquipmentWithDependencies("missing_equipment")
    ).rejects.toThrow("Equipment was not found.");

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.equipment.delete).not.toHaveBeenCalled();
  });

  it("creates initial readings and immediate predictions during registration", async () => {
    const formData = new FormData();
    formData.set("registrationMode", "manual");
    formData.append("equipmentRowId", "row_1");
    formData.append("initialReadingEnabled", "row_1");
    formData.append("assetTag", "REAL-PMP-001");
    formData.append("name", "Injection Pump");
    formData.append("category", "PUMP");
    formData.append("status", "ACTIVE");
    formData.append("location", "Flow Station A");
    formData.append("manufacturer", "");
    formData.append("model", "");
    formData.append("serialNumber", "");
    formData.append("installationDate", "");
    formData.append("description", "");
    formData.append("recordedAt", "2026-08-27T12:00");
    formData.append("type", "M");
    formData.append("airTemperatureKelvin", "300");
    formData.append("processTemperatureKelvin", "310");
    formData.append("rotationalSpeedRpm", "1500");
    formData.append("torqueNm", "40");
    formData.append("toolWearMinutes", "120");
    formData.append("pressureBar", "52");
    formData.append("vibrationMmS", "2.4");
    formData.append("flowRateBpd", "1280");
    formData.append("operatingHours", "8000");

    await createEquipmentAction(formData);

    expect(mockPrisma.equipment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetTag: "REAL-PMP-001",
        name: "Injection Pump",
      }),
      select: { id: true },
    });
    expect(mockPrisma.operationalReading.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "admin_1",
        equipmentId: "equipment_1",
        sourceType: "MANUAL_ENTRY",
        parameters: expect.objectContaining({
          airTemperatureKelvin: 300,
          pressureBar: 52,
          vibrationMmS: 2.4,
        }),
      }),
      select: {
        equipmentId: true,
        id: true,
      },
    });
    expect(createPredictionsForReadings).toHaveBeenCalledWith({
      actorId: "admin_1",
      readingIds: ["reading_1"],
    });
    expect(redirect).toHaveBeenCalledWith(
      "/equipment/equipment_1?toast=equipment-created"
    );
  });
});
