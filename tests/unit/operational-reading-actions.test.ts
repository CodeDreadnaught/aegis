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
        findMany: vi.fn(),
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
    mockPrisma.operationalReading.findMany.mockResolvedValue([]);
    mockPrisma.operationalReading.createManyAndReturn.mockResolvedValue([
      { equipmentId: "equipment_1", id: "reading_1", sourceType: "REFERENCE_DATASET" },
    ]);
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 1 });
    createPredictionsForReadings.mockResolvedValue({
      created: 1,
      failed: 0,
      skipped: 0,
    });
  });

  it("imports historical Christmas Tree telemetry with zero RPM and torque without predictions", async () => {
    const { createOperationalReadingAction } = await import(
      "@/features/operational-readings/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,recordedAt,productType,airTemperatureK,processTemperatureK,rotationalSpeedRpm,torqueNm,toolWearMin,pressureBar,vibrationMmS,flowRateBpd,operatingHours,sourceType",
      "XTR-001,2026-08-25T12:30:00,M,298.15,307.15,0,0,0,46,0,1145,1280,REFERENCE_DATASET",
    ].join("\n");

    formData.set("sourceType", "SENSOR_IMPORT");
    formData.set("importMode", "HISTORICAL_IMPORT");
    formData.set("sensorImportFile", new File([csv], "readings.csv", { type: "text/csv" }));

    await expect(createOperationalReadingAction(formData)).resolves.toMatchObject({
      count: 1,
      importMode: "HISTORICAL_IMPORT",
      processed: 1,
      skippedDuplicates: 0,
    });
    expect(mockPrisma.operationalReading.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          equipmentId: "equipment_1",
          parameters: expect.objectContaining({
            rotationalSpeedRpm: 0,
            torqueNm: 0,
            toolWearMinutes: 0,
          }),
          predictionEligible: false,
          sourceType: "REFERENCE_DATASET",
        }),
      ],
      skipDuplicates: true,
      select: {
        equipmentId: true,
        id: true,
        sourceType: true,
      },
    });
    expect(createPredictionsForReadings).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/operational-data");
  });

  it("keeps live sensor imports prediction eligible", async () => {
    mockPrisma.operationalReading.createManyAndReturn.mockResolvedValueOnce([
      { equipmentId: "equipment_1", id: "reading_1", sourceType: "SENSOR_IMPORT" },
    ]);
    const { createOperationalReadingAction } = await import(
      "@/features/operational-readings/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,recordedAt,productType,airTemperatureK,processTemperatureK,rotationalSpeedRpm,torqueNm,toolWearMin,pressureBar,vibrationMmS,flowRateBpd,operatingHours",
      "XTR-001,2026-08-25T12:30:00,M,298.15,307.15,0,0,0,46,0,1145,1280",
    ].join("\n");

    formData.set("sourceType", "SENSOR_IMPORT");
    formData.set("sensorImportFile", new File([csv], "readings.csv", { type: "text/csv" }));

    await expect(createOperationalReadingAction(formData)).resolves.toMatchObject({
      count: 1,
      importMode: "LIVE_IMPORT",
    });
    expect(mockPrisma.operationalReading.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ predictionEligible: true })],
      })
    );
    expect(createPredictionsForReadings).toHaveBeenCalledWith({
      actorId: "operator_1",
      readingIds: ["reading_1"],
    });
  });

  it("skips duplicate historical readings by equipment and timestamp", async () => {
    mockPrisma.operationalReading.findMany.mockResolvedValueOnce([
      { equipmentId: "equipment_1", recordedAt: new Date("2026-08-25T12:30:00.000Z") },
    ]);
    const { createOperationalReadingAction } = await import(
      "@/features/operational-readings/actions"
    );
    const formData = new FormData();
    const csv = [
      "assetTag,recordedAt,productType,airTemperatureK,processTemperatureK,rotationalSpeedRpm,torqueNm,toolWearMin,pressureBar,vibrationMmS,flowRateBpd,operatingHours,sourceType",
      "XTR-001,2026-08-25T12:30:00Z,M,298.15,307.15,0,0,0,46,0,1145,1280,REFERENCE_DATASET",
    ].join("\n");

    formData.set("sourceType", "SENSOR_IMPORT");
    formData.set("importMode", "HISTORICAL_IMPORT");
    formData.set("sensorImportFile", new File([csv], "readings.csv", { type: "text/csv" }));

    await expect(createOperationalReadingAction(formData)).resolves.toMatchObject({
      count: 0,
      processed: 1,
      skippedDuplicates: 1,
    });
    expect(mockPrisma.operationalReading.createManyAndReturn).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.createMany).not.toHaveBeenCalled();
    expect(createPredictionsForReadings).not.toHaveBeenCalled();
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