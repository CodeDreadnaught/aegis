import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, processPendingPredictionJobs } = vi.hoisted(() => ({
  mockPrisma: {
    operationalReading: {
      findFirst: vi.fn(),
    },
    predictionJob: {
      findFirst: vi.fn(),
    },
  },
  processPendingPredictionJobs: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-service", () => ({
  processPendingPredictionJobs,
}));

import {
  normalisePredictionJobLimit,
  processPredictionRecoverySweep,
} from "@/features/analytics/prediction-worker";

describe("prediction recovery worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.predictionJob.findFirst.mockResolvedValue(null);
    mockPrisma.operationalReading.findFirst.mockResolvedValue(null);
    processPendingPredictionJobs.mockResolvedValue({
      completed: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    });
  });

  it("returns cheaply without importing recovery processing when there is no work", async () => {
    await expect(processPredictionRecoverySweep()).resolves.toEqual({
      completed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    });

    expect(processPendingPredictionJobs).not.toHaveBeenCalled();
  });

  it("loads the processing service only when eligible work exists", async () => {
    mockPrisma.predictionJob.findFirst.mockResolvedValue({ id: "job_1" });

    await expect(processPredictionRecoverySweep({ limit: 4 })).resolves.toEqual({
      completed: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    });

    expect(processPendingPredictionJobs).toHaveBeenCalledWith({
      actorId: undefined,
      limit: 4,
    });
  });

  it("normalises worker limits conservatively", () => {
    expect(normalisePredictionJobLimit(undefined)).toBe(10);
    expect(normalisePredictionJobLimit(0)).toBe(1);
    expect(normalisePredictionJobLimit(500)).toBe(50);
    expect(normalisePredictionJobLimit(12.8)).toBe(12);
  });
});
