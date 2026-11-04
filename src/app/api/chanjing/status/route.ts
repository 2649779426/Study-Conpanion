import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(
      process.env.CHANJING_APP_ID && process.env.CHANJING_SECRET_KEY,
    ),
    apiBase:
      process.env.CHANJING_API_BASE || "https://open-api.chanjing.cc/open/v1",
  });
}
