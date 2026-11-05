import { NextResponse } from "next/server";
import { createJob, advanceJob, getJob } from "@/lib/chanjing/jobs";
import { videoHash } from "@/lib/playback";
import { getAvatarConfig } from "@/lib/chanjing/avatar";
import type { ScriptScene } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "生成请求失败" }, { status: 500 });
}
export async function POST(request: Request) {
  if (!process.env.CHANJING_APP_ID || !process.env.CHANJING_SECRET_KEY)
    return NextResponse.json({ ok: false, error: "未配置蝉镜凭据，见 README" }, { status: 503 });
  try {
    const body = await request.json();
    if (!["opening", "reminder", "review"].includes(body.scene) || typeof body.text !== "string" || !body.text.trim() || body.text.length > 3000)
      return NextResponse.json({ ok: false, error: "需要有效场景和 1–3000 字播报文本" }, { status: 400 });
    const job = await createJob(body.scene as ScriptScene, body.text);
    return NextResponse.json({ ok: true, jobId: job.jobId, job });
  } catch (error) { return failure(error); }
}
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const id = query.get("id");
    if (id) {
      const job = await advanceJob(id);
      return job ? NextResponse.json({ ok: true, job }) : NextResponse.json({ ok: false, error: "找不到生成任务" }, { status: 404 });
    }
    const scene = query.get("scene");
    const text = query.get("text");
    if (!scene || !["opening", "reminder", "review"].includes(scene) || text === null || text.length > 3000)
      return NextResponse.json({ ok: false, error: "需要任务 id，或场景与最终文案" }, { status: 400 });
    const job = await getJob(await videoHash(scene as ScriptScene, text, getAvatarConfig()));
    return NextResponse.json({ ok: true, job });
  } catch (error) { return failure(error); }
}
