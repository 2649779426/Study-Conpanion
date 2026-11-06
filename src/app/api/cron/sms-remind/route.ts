import { NextResponse } from "next/server";
import { runSmsReminders } from "@/lib/sms/remind";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.AUTH_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(req.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runSmsReminders();
  return NextResponse.json({ ok: true, ...report });
}

export async function GET(req: Request) {
  return POST(req);
}
