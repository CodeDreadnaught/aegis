import { NextResponse } from "next/server";

import {
  getOverviewLiveSnapshot,
  parseOverviewRange,
} from "@/features/overview/live-snapshot";
import { requirePermission } from "@/server/auth/session";

export async function GET(request: Request) {
  await requirePermission("viewEquipment");

  const { searchParams } = new URL(request.url);
  const range = parseOverviewRange(searchParams.get("range"));
  const snapshot = await getOverviewLiveSnapshot(range);

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
