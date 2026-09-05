import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueuePredictionJobs, mockPrisma, send } = vi.hoisted(() => ({
  enqueuePredictionJobs: vi.fn(),
  mockPrisma: {
    operationalReading: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    predictionJob: {
      findMany: vi.fn(),
    },
  },
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@vercel/queue", () => ({ send }));
vi.mock("@/server/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/features/analytics/prediction-queue", () => ({
  enqueuePredictionJobs,
  maxPredictionJobAttempts: 3,
}));

import {
  buildPredictionQueueIdempotencyKey,
  dispatchLatestPredictionJobsForEquipment,
  dispatchPredictionJobsForReadings,
} from "@/features/analytics/prediction-dispatcher";

describe("prediction dispatcher", () => {
  const now = new Date("2026-08-27T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    enqueuePredictionJobs.mockResolvedValue(undefined);
    send.mockResolvedValue({ messageId: "message_1" });
    mockPrisma.predictionJob.findMany.mockResolvedValue([
      {
        attempts: 0,
        nextRunAt: now,
        operationalReadingId: "reading_1",
        status: "PENDING",
      },
    ]);
  });

  it("persists prediction jobs before publishing queue messages", async () => {
    await expect(
      dispatchPredictionJobsForReadings(["reading_1"], { now })
    ).resolves.toEqual({
      dispatched: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    });

    expect(enqueuePredictionJobs).toHaveBeenCalledWith(["reading_1"]);
    expect(mockPrisma.predictionJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          operationalReadingId: {
            in: ["reading_1"],
          },
        },
      })
    );
    expect(enqueuePredictionJobs.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0]
    );
    expect(send).toHaveBeenCalledWith(
      "aegis-predictions",
      { readingId: "reading_1" },
      expect.objectContaining({
        delaySeconds: 0,
        idempotencyKey: buildPredictionQueueIdempotencyKey({
          attempts: 0,
          nextRunAt: now,
          operationalReadingId: "reading_1",
        }),
      })
    );
  });

  it("skips completed, in-flight and terminal jobs", async () => {
    mockPrisma.predictionJob.findMany.mockResolvedValueOnce([
      {
        attempts: 0,
        nextRunAt: now,
        operationalReadingId: "completed_reading",
        status: "COMPLETED",
      },
      {
        attempts: 1,
        nextRunAt: now,
        operationalReadingId: "processing_reading",
        status: "PROCESSING",
      },
      {
        attempts: 3,
        nextRunAt: now,
        operationalReadingId: "failed_reading",
        status: "FAILED",
      },
    ]);

    await expect(
      dispatchPredictionJobsForReadings([
        "completed_reading",
        "processing_reading",
        "failed_reading",
      ], { now })
    ).resolves.toEqual({
      dispatched: 0,
      failed: 0,
      skipped: 3,
      total: 3,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("uses delayed queue delivery for retry windows", async () => {
    mockPrisma.predictionJob.findMany.mockResolvedValueOnce([
      {
        attempts: 1,
        nextRunAt: new Date("2026-08-27T00:05:00.000Z"),
        operationalReadingId: "reading_retry",
        status: "FAILED",
      },
    ]);

    await dispatchPredictionJobsForReadings(["reading_retry"], { now });

    expect(send).toHaveBeenCalledWith(
      "aegis-predictions",
      { readingId: "reading_retry" },
      expect.objectContaining({ delaySeconds: 300 })
    );
  });

  it("dispatches only the latest prediction-eligible reading per equipment", async () => {
    mockPrisma.operationalReading.groupBy.mockResolvedValue([
      {
        _max: { recordedAt: new Date("2026-08-27T08:00:00.000Z") },
        equipmentId: "equipment_1",
      },
      {
        _max: { recordedAt: new Date("2026-08-26T08:00:00.000Z") },
        equipmentId: "equipment_2",
      },
    ]);
    mockPrisma.operationalReading.findMany.mockResolvedValue([
      { id: "reading_latest_1", predictions: [] },
      { id: "reading_latest_2", predictions: [] },
    ]);
    mockPrisma.predictionJob.findMany.mockResolvedValueOnce([
      {
        attempts: 0,
        nextRunAt: now,
        operationalReadingId: "reading_latest_1",
        status: "PENDING",
      },
      {
        attempts: 0,
        nextRunAt: now,
        operationalReadingId: "reading_latest_2",
        status: "PENDING",
      },
    ]);

    await dispatchLatestPredictionJobsForEquipment([
      "equipment_1",
      "equipment_2",
      "equipment_1",
    ], { now });

    expect(mockPrisma.operationalReading.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["equipmentId"],
        where: expect.objectContaining({
          equipmentId: { in: ["equipment_1", "equipment_2"] },
          predictionEligible: true,
        }),
      })
    );
    expect(enqueuePredictionJobs).toHaveBeenCalledWith([
      "reading_latest_1",
      "reading_latest_2",
    ]);
    expect(send).toHaveBeenCalledTimes(2);
  });
});