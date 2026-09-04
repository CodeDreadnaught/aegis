import { NextRequest, NextResponse } from "next/server";

import {
  normalisePredictionJobLimit,
  processPredictionRecoverySweep,
} from "@/features/analytics/prediction-worker";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorised = authoriseWorkerRequest(request);

  if (authorised) {
    return authorised;
  }

  const payload = await request.json().catch(() => null);
  const requestedLimit =
    payload &&
    typeof payload === "object" &&
    "limit" in payload &&
    typeof payload.limit === "number"
      ? payload.limit
      : undefined;
  const limit = normalisePredictionJobLimit(requestedLimit);
  const result = await processPredictionRecoverySweep({ limit });

  return NextResponse.json({
    ...result,
    limit,
  });
}

export async function GET(request: NextRequest) {
  const authorised = authoriseWorkerRequest(request);

  if (authorised) {
    return authorised;
  }

  const requestedLimit = request.nextUrl.searchParams.get("limit");
  const limit = normalisePredictionJobLimit(
    requestedLimit ? Number(requestedLimit) : undefined
  );
  const result = await processPredictionRecoverySweep({ limit });

  return NextResponse.json({
    ...result,
    limit,
  });
}

function authoriseWorkerRequest(request: NextRequest) {
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

  return null;
}
