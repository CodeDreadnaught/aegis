import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, runAegisInference } = vi.hoisted(() => ({
  mockPrisma: {
    auditLog: {
      create: vi.fn(),
    },
    operationalReading: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    prediction: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    predictionJob: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  runAegisInference: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/server/ml/aegis-inference", () => ({ runAegisInference }));

import {
  createPredictionForReading,
  getNextPredictionRetryAt,
  getPredictionRetryDelayMinutes,
  maxPredictionJobAttempts,
  processPendingPredictionJobs,
} from "@/features/analytics/prediction-service";

describe("prediction job processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.predictionJob.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.predictionJob.findUnique.mockResolvedValue({
      attempts: 0,
      status: "PENDING",
    });
    mockPrisma.predictionJob.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.prediction.findUnique.mockResolvedValue(null);
    mockPrisma.operationalReading.findUnique.mockResolvedValue({
      equipmentId: "equipment_1",
      id: "reading_1",
      parameters: {
        airTemperatureKelvin: 300,
        processTemperatureKelvin: 310,
        rotationalSpeedRpm: 1450,
        torqueNm: 42,
        toolWearMinutes: 90,
        type: "M",
      },
    });
    mockPrisma.prediction.create.mockResolvedValue({
      equipmentId: "equipment_1",
      failureProbability: 0.12,
      id: "prediction_1",
      riskLevel: "LOW",
    });
    runAegisInference.mockResolvedValue({ failureProbability: 0.12 });
  });

  it("uses atomic claim failure to prevent duplicate prediction side effects", async () => {
    mockPrisma.predictionJob.updateMany.mockResolvedValueOnce({ count: 0 });
    mockPrisma.prediction.findUnique.mockResolvedValueOnce({
      equipmentId: "equipment_1",
      id: "prediction_existing",
    });

    await expect(
      createPredictionForReading({ readingId: "reading_1" })
    ).resolves.toEqual({
      created: false,
      equipmentId: "equipment_1",
      predictionId: "prediction_existing",
    });

    expect(runAegisInference).not.toHaveBeenCalled();
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    expect(mockPrisma.predictionJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });

  it("creates prediction side effects only after claiming the job", async () => {
    await expect(
      createPredictionForReading({ actorId: "user_1", readingId: "reading_1" })
    ).resolves.toMatchObject({
      created: true,
      equipmentId: "equipment_1",
      predictionId: "prediction_1",
    });

    expect(mockPrisma.predictionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PROCESSING" }),
      })
    );
    expect(mockPrisma.prediction.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("queries only bounded and eligible jobs for recovery", async () => {
    mockPrisma.operationalReading.findMany.mockResolvedValue([]);
    mockPrisma.predictionJob.findMany.mockResolvedValue([]);

    await processPendingPredictionJobs({ limit: 9 });

    expect(mockPrisma.operationalReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 9,
        where: expect.objectContaining({
          predictionEligible: true,
        }),
      })
    );

    expect(mockPrisma.predictionJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 9,
        where: expect.objectContaining({
          attempts: { lt: maxPredictionJobAttempts },
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: { in: ["PENDING", "FAILED"] },
            }),
            expect.objectContaining({
              status: "PROCESSING",
            }),
          ]),
        }),
      })
    );
  });

  it("treats retry backoff as earliest eligibility, not exact execution", () => {
    const base = new Date("2026-08-27T00:00:00.000Z");

    expect(getPredictionRetryDelayMinutes(1)).toBe(5);
    expect(getPredictionRetryDelayMinutes(2)).toBe(30);
    expect(getPredictionRetryDelayMinutes(3)).toBe(120);
    expect(getPredictionRetryDelayMinutes(99)).toBe(120);
    expect(getNextPredictionRetryAt(2, base).toISOString()).toBe(
      "2026-08-27T00:30:00.000Z"
    );
  });
});
