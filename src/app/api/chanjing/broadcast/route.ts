import { NextResponse } from "next/server";
import { chanjingFetch } from "@/lib/chanjing/client";

export const runtime = "nodejs";
export const maxDuration = 300;

type AudioMan = {
  id: string;
  name?: string;
};

type DigitalPerson = {
  id: string;
  name?: string;
  figures?: Array<{
    type?: string;
    width?: number;
    height?: number;
  }>;
};

type AudioTaskState = {
  status?: number;
  errMsg?: string;
  errReason?: string;
  full?: { url?: string; duration?: number };
};

type VideoInfo = {
  queue_status?: string;
  queue_desc?: string;
  msg?: string;
  video_url?: string;
  duration?: number;
};

function pickMeaningful<T extends { name?: string }>(list: T[]): T {
  const ranked = [...list].sort((a, b) => {
    const score = (name?: string) => {
      const n = name || "";
      let s = 0;
      if (n && !/^未命名|test|测试|demo/i.test(n)) s += 2;
      if (/[\u4e00-\u9fff]/.test(n)) s += 2;
      if (n.length >= 2) s += 1;
      return s;
    };
    return score(b.name) - score(a.name);
  });
  if (!ranked[0]) throw new Error("empty resource list");
  return ranked[0];
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitAudio(taskId: string) {
  let interval = 3000;
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await chanjingFetch<AudioTaskState>("/audio_task_state", {
      method: "POST",
      body: JSON.stringify({ task_id: taskId }),
    });
    const data = res.data;
    if (data.errMsg || data.errReason) {
      throw new Error(
        `TTS failed errMsg=${data.errMsg ?? ""} errReason=${data.errReason ?? ""} trace_id=${res.trace_id ?? ""}`,
      );
    }
    if (data.status === 9 && data.full?.url) return data;
    await sleep(interval);
    interval = Math.min(interval * 2, 10000);
  }
  throw new Error("TTS polling timeout");
}

async function waitVideo(taskId: string) {
  let interval = 5000;
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await chanjingFetch<VideoInfo>(
      `/video?id=${encodeURIComponent(taskId)}`,
    );
    const data = res.data;
    if (data.queue_status === "completed" && data.video_url) return data;
    if (data.queue_status === "failed") {
      throw new Error(`video failed msg=${data.msg ?? ""} trace_id=${res.trace_id ?? ""}`);
    }
    if (data.queue_status === "other") {
      throw new Error(
        `video other queue_status=${data.queue_status} msg=${data.msg ?? ""} queue_desc=${data.queue_desc ?? ""} trace_id=${res.trace_id ?? ""}`,
      );
    }
    await sleep(interval);
    interval = Math.min(interval * 2, 15000);
  }
  throw new Error("video polling timeout");
}

export async function POST(request: Request) {
  try {
    if (!process.env.CHANJING_APP_ID || !process.env.CHANJING_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "ChanJing credentials are not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
    };
    const text =
      body.text?.trim() ||
      "同学你好，我是你的考研督学助手。今天按计划推进，完成后记得打卡。";

    const audioList = await chanjingFetch<{ list: AudioMan[] }>(
      "/list_common_audio?page=1&size=20",
    );
    const voice = pickMeaningful(audioList.data.list || []);

    const createdAudio = await chanjingFetch<{ task_id: string }>(
      "/create_audio_task",
      {
        method: "POST",
        body: JSON.stringify({
          audio_man: voice.id,
          speed: 1,
          text: { text, plain_text: text },
        }),
      },
    );

    const audio = await waitAudio(createdAudio.data.task_id);
    const audioUrl = audio.full?.url;
    if (!audioUrl) throw new Error("missing audio url");

    const dpList = await chanjingFetch<{ list: DigitalPerson[] }>(
      "/list_common_dp?page=1&size=20",
    );
    const person = pickMeaningful(dpList.data.list || []);
    const figure =
      (person.figures || []).find((f) => f.type && f.width && f.height) ||
      person.figures?.[0];
    if (!figure?.type || !figure.width || !figure.height) {
      throw new Error("digital person figure incomplete");
    }

    const createdVideo = await chanjingFetch<string>("/create_video", {
      method: "POST",
      body: JSON.stringify({
        person: {
          id: person.id,
          figure_type: figure.type,
          width: figure.width,
          height: figure.height,
        },
        audio: {
          type: "audio",
          wav_url: audioUrl,
          volume: 100,
        },
        screen_width: figure.width,
        screen_height: figure.height,
        hide_subtitle: true,
      }),
    });

    const video = await waitVideo(createdVideo.data);

    return NextResponse.json({
      ok: true,
      audio_url: audioUrl,
      audio_duration: audio.full?.duration ?? null,
      video_url: video.video_url,
      video_duration: video.duration ?? null,
      person_name: person.name,
      voice_name: voice.name,
      temporary: true,
      note: "URLs are temporary; persist ASAP",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
