import { NextResponse } from "next/server";
import { getAvatarConfig } from "@/lib/chanjing/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { personId, audioManId } = getAvatarConfig();
  return NextResponse.json({
    avatar: { personId, audioManId },
    configured: Boolean(
      process.env.CHANJING_APP_ID && process.env.CHANJING_SECRET_KEY,
    ),
    apiBase:
      process.env.CHANJING_API_BASE || "https://open-api.chanjing.cc/open/v1",
  });
}
