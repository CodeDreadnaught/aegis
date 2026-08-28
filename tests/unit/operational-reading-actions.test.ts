import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPredictionsForReadings, mockPrisma, revalidatePath, requirePermission } =
  vi.hoisted(() => ({
    createPredictionsForReadings: vi.fn(),
    mockPrisma: {
      auditLog: {
        createMany: vi.fn(),
      },
      equipment: {
        findMany: vi.fn(),
      },
      operationalReading: {
        createManyAndReturn: vi.fn(),
      },
    },
    revalidatePath: vi.fn(),
    requirePermission: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/server/auth/session", () => ({ requirePermission }));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-service", () => ({
  createPredictionsForReadings,
}));

describe("operational reading actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue({ id: "operator_1" });
    mockPrisma.equipment.findMany.mockResolvedValue([
      {
        assetTag: "XTR-001",
        category: "CHRISTMAS_TREE",
        id: "equipment_1",
      },
    ]);
    mockPrisma.operationalReading.createManyAndReturn.mockResolvedValue([
      { equipmentId: "equipment_1", id: "reading_1" },
    ]);
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 1 });
    createPredictionsForReadings.mockResolvedValue({
      created: 1,
      failed: 0,
      skipped: 0,
    });
  });

  it("imports historical Christmas Tree telemetry with zero RPM and torque", async () => {
    const { createOperationalReadingAction } = await import(
      "@/features/operational-readings/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,recordedAt,productType,airTemperatureK,processTemperatureK,rotationalSpeedRpm,torqueNm,toolWearMin,pressureBar,vibrationMmS,flowRateBpd,operatingHours,sourceType",
      "XTR-001,2026-08-25T12:30:00,M,298.15,307.15,0,0,0,46,0,1145,1280,SENSOR_IMPORT",
    ].join("\n");

    formData.set("sourceType", "SENSOR_IMPORT");
    formData.set("sensorImportFile", new File([csv], "readings.csv", { type: "text/csv" }));

    await expect(createOperationalReadingAction(formData)).resolves.toMatchObject({
      count: 1,
    });
    expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          assetTag: true,
          category: true,
          id: true,
        },
      })
    );
    expect(mockPrisma.operationalReading.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          equipmentId: "equipment_1",
          parameters: expect.objectContaining({
            rotationalSpeedRpm: 0,
            torqueNm: 0,
            toolWearMinutes: 0,
          }),
          sourceType: "SENSOR_IMPORT",
        }),
      ],
      select: {
        equipmentId: true,
        id: true,
      },
    });
    expect(createPredictionsForReadings).toHaveBeenCalledWith({
      actorId: "operator_1",
      readingIds: ["reading_1"],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/operational-data");
  });

  it("rejects sensor imports that cannot identify equipment per row", async () => {
    const { createOperationalReadingAction } = await import(
      "@/features/operational-readings/actions"
    );
    const formData = new FormData();
    const csv = [
      "recordedAt,productType,airTemperatureK,processTemperatureK,rotationalSpeedRpm,torqueNm,toolWearMin",
      "2026-08-25T12:30:00,M,298.15,307.15,0,0,0",
    ].join("\n");

    formData.set("sourceType", "SENSOR_IMPORT");
    formData.set("sensorImportFile", new File([csv], "readings.csv", { type: "text/csv" }));

    await expect(createOperationalReadingAction(formData)).rejects.toThrow(
      "Provide equipmentId or assetTag."
    );
    expect(mockPrisma.operationalReading.createManyAndReturn).not.toHaveBeenCalled();
  });
});