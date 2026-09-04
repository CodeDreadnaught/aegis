import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { processPredictionRecoverySweep } = vi.hoisted(() => ({
  processPredictionRecoverySweep: vi.fn(),
}));

vi.mock("@/features/analytics/prediction-worker", () => ({
  normalisePredictionJobLimit(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return 10;
    }

    return Math.min(50, Math.max(1, Math.floor(value)));
  },
  processPredictionRecoverySweep,
}));

import { GET, POST } from "@/app/api/jobs/predictions/run/route";

describe("prediction job worker routes", () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    processPredictionRecoverySweep.mockResolvedValue({
      completed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    });
  });

  afterAll(() => {
    process.env.CRON_SECRET = previousSecret;
  });

  it("rejects unauthorised GET cron requests", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/jobs/predictions/run")
    );

    expect(response.status).toBe(401);
    expect(processPredictionRecoverySweep).not.toHaveBeenCalled();
  });

  it("runs the shared worker from authorised GET cron requests", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/jobs/predictions/run?limit=5", {
        headers: { authorization: "Bearer test-cron-secret" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ limit: 5 });
    expect(processPredictionRecoverySweep).toHaveBeenCalledWith({ limit: 5 });
  });

  it("runs the same shared worker from authorised POST requests", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/jobs/predictions/run", {
        body: JSON.stringify({ limit: 7 }),
        headers: {
          authorization: "Bearer test-cron-secret",
          "content-type": "application/json",
        },
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ limit: 7 });
    expect(processPredictionRecoverySweep).toHaveBeenCalledWith({ limit: 7 });
  });
});
