import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchPredictionJobRecords, mockPrisma } = vi.hoisted(() => ({
  dispatchPredictionJobRecords: vi.fn(),
  mockPrisma: {
    predictionJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-dispatcher", () => ({
  dispatchPredictionJobRecords,
}));

import {
  normalisePredictionJobLimit,
  processPredictionRecoverySweep,
} from "@/features/analytics/prediction-worker";

describe("prediction recovery worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.predictionJob.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.predictionJob.findMany.mockResolvedValue([]);
    dispatchPredictionJobRecords.mockResolvedValue({
      dispatched: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    });
  });

  it("performs bounded dispatch-only reconciliation without scanning historical readings", async () => {
    await expect(processPredictionRecoverySweep()).resolves.toEqual({
      dispatched: 0,
      failed: 0,
      repaired: 0,
      skipped: 0,
      stale: 0,
      total: 0,
    });

    expect(mockPrisma.predictionJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: expect.objectContaining({
          attempts: { lt: 3 },
          status: { in: ["PENDING", "FAILED"] },
        }),
      })
    );
    expect(dispatchPredictionJobRecords).toHaveBeenCalledWith([], {
      dueOnly: true,
      now: expect.any(Date),
    });
  });

  it("repairs completed prediction jobs and releases stale processing jobs before dispatch", async () => {
    mockPrisma.predictionJob.updateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
    const jobs = [
      {
        attempts: 1,
        nextRunAt: new Date("2026-08-27T00:00:00.000Z"),
        operationalReadingId: "reading_1",
        status: "FAILED",
      },
    ];
    mockPrisma.predictionJob.findMany.mockResolvedValue(jobs);
    dispatchPredictionJobRecords.mockResolvedValue({
      dispatched: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    });

    await expect(processPredictionRecoverySweep({ limit: 4 })).resolves.toEqual({
      dispatched: 1,
      failed: 0,
      repaired: 2,
      skipped: 0,
      stale: 1,
      total: 1,
    });

    expect(mockPrisma.predictionJob.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(mockPrisma.predictionJob.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
        where: expect.objectContaining({ status: "PROCESSING" }),
      })
    );
    expect(dispatchPredictionJobRecords).toHaveBeenCalledWith(jobs, {
      dueOnly: true,
      now: expect.any(Date),
    });
  });

  it("normalises worker limits conservatively", () => {
    expect(normalisePredictionJobLimit(undefined)).toBe(10);
    expect(normalisePredictionJobLimit(0)).toBe(1);
    expect(normalisePredictionJobLimit(500)).toBe(50);
    expect(normalisePredictionJobLimit(12.8)).toBe(12);
  });
});