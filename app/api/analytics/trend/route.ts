import { NextResponse } from "next/server";

import { getAnalyticsTrendWorkspace } from "@/features/analytics/queries";
import {
  parseAnalyticsFleetMetric,
  parseAnalyticsTrendCategory,
  parseAnalyticsTrendMode,
  parseAnalyticsTrendRange,
  serializeAnalyticsTrendState,
} from "@/features/analytics/trend-types";
import { requirePermission } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requirePermission("runPrediction");

  const { searchParams } = new URL(request.url);
  const workspace = await getAnalyticsTrendWorkspace({
    category: parseAnalyticsTrendCategory(searchParams.get("category")),
    equipmentId: searchParams.get("equipment") ?? undefined,
    fleetMetric: parseAnalyticsFleetMetric(searchParams.get("metric")),
    trendMode: parseAnalyticsTrendMode(searchParams.get("mode")),
    trendRange: parseAnalyticsTrendRange(searchParams.get("trend")),
  });

  return NextResponse.json(
    serializeAnalyticsTrendState(workspace),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}