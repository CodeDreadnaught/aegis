import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPredictionForReading, markPredictionJobFailed, mockPrisma } = vi.hoisted(() => ({
  createPredictionForReading: vi.fn(),
  markPredictionJobFailed: vi.fn(),
  mockPrisma: {
    operationalReading: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-queue", () => ({
  maxPredictionJobAttempts: 3,
  stalePredictionProcessingMinutes: 15,
}));
vi.mock("@/features/analytics/prediction-service", () => ({
  createPredictionForReading,
  markPredictionJobFailed,
}));

import {
  countPredictionBackfillCandidates,
  findPredictionBackfillCandidates,
  processPredictionBackfillReading,
} from "@/features/analytics/prediction-backfill";

describe("prediction backfill helpers", () => {
  const now = new Date("2026-08-27T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.operationalReading.count.mockResolvedValue(12);
    mockPrisma.operationalReading.findMany.mockResolvedValue([]);
    createPredictionForReading.mockResolvedValue({
      created: true,
      equipmentId: "equipment_1",
      predictionId: "prediction_1",
    });
    markPredictionJobFailed.mockResolvedValue({
      attempts: 1,
      maxAttempts: 3,
      nextRunAt: new Date("2026-08-27T00:05:00.000Z"),
      terminal: false,
    });
  });

  it("counts only prediction-eligible readings without successful predictions and with processable job state", async () => {
    await expect(countPredictionBackfillCandidates(now)).resolves.toBe(12);

    expect(mockPrisma.operationalReading.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        predictionEligible: true,
        predictions: { none: {} },
        OR: expect.arrayContaining([
          { predictionJob: null },
          expect.objectContaining({
            predictionJob: expect.objectContaining({
              is: expect.objectContaining({
                attempts: { lt: 3 },
                status: { in: ["PENDING", "FAILED"] },
              }),
            }),
          }),
          expect.objectContaining({
            predictionJob: expect.objectContaining({
              is: expect.objectContaining({
                status: "PROCESSING",
              }),
            }),
          }),
        ]),
      }),
    });
  });

  it("loads a bounded ordered candidate batch without loading the full backlog", async () => {
    await findPredictionBackfillCandidates({ now, take: 50 });

    expect(mockPrisma.operationalReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
        take: 50,
        where: expect.objectContaining({
          predictions: { none: {} },
        }),
      })
    );
  });

  it("uses the shared prediction processor for successful readings", async () => {
    await expect(processPredictionBackfillReading("reading_1")).resolves.toEqual({
      status: "completed",
    });

    expect(createPredictionForReading).toHaveBeenCalledWith({
      readingId: "reading_1",
    });
    expect(markPredictionJobFailed).not.toHaveBeenCalled();
  });

  it("records isolated reading failures and lets the backfill continue", async () => {
    const error = new Error("Malformed historical reading");
    createPredictionForReading.mockRejectedValueOnce(error);

    await expect(processPredictionBackfillReading("reading_bad")).resolves.toEqual({
      failure: expect.objectContaining({ terminal: false }),
      status: "failed",
    });

    expect(markPredictionJobFailed).toHaveBeenCalledWith("reading_bad", error);
  });
});