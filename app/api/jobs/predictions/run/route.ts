import { NextRequest, NextResponse } from "next/server";

import { processPendingPredictionJobs } from "@/features/analytics/prediction-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Prediction worker secret is not configured." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const requestedLimit =
    payload &&
    typeof payload === "object" &&
    "limit" in payload &&
    typeof payload.limit === "number"
      ? payload.limit
      : 10;
  const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));
  const result = await processPendingPredictionJobs({ limit });

  return NextResponse.json({
    ...result,
    limit,
  });
}
