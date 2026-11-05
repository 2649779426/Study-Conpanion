import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const API_BASE = () => (process.env.CHANJING_API_BASE || "https://open-api.chanjing.cc/open/v1").replace(/\/$/, "");

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) throw new Error(".env.local missing");
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const key = t.slice(0, i);
    const value = t.slice(i + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (token) headers.access_token = token;
  const res = await fetch(`${API_BASE()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(
      `${path} code=${json.code} msg=${json.msg ?? ""} trace_id=${json.trace_id ?? ""}`,
    );
  }
  return json;
}

async function waitAudio(token, taskId) {
  let interval = 3000;
  const deadline = Date.now() + 5 * 60 * 1000;
  let last = null;
  while (Date.now() < deadline) {
    const json = await api("/audio_task_state", {
      method: "POST",
      token,
      body: { task_id: taskId },
    });
    last = json.data;
    if (last?.errMsg || last?.errReason) {
      throw new Error(
        `TTS failed errMsg=${last.errMsg ?? ""} errReason=${last.errReason ?? ""}`,
      );
    }
    if (last?.status === 9 && last?.full?.url) return last;
    await sleep(interval);
    interval = Math.min(interval * 2, 10000);
  }
  throw new Error(`TTS timeout status=${last?.status ?? "null"}`);
}

async function waitVideo(token, videoId) {
  let interval = 5000;
  const deadline = Date.now() + 20 * 60 * 1000;
  let last = null;
  while (Date.now() < deadline) {
    const json = await api(`/video?id=${encodeURIComponent(videoId)}`, {
      token,
    });
    last = json.data;
    if (last?.queue_status === "completed" && last?.video_url) return last;
    if (last?.queue_status === "failed") {
      throw new Error(`video failed msg=${last.msg ?? ""}`);
    }
    if (last?.queue_status === "other") {
      throw new Error(
        `video other msg=${last.msg ?? ""} queue_desc=${last.queue_desc ?? ""}`,
      );
    }
    await sleep(interval);
    interval = Math.min(interval * 2, 15000);
  }
  throw new Error(`video timeout queue_status=${last?.queue_status ?? "null"}`);
}

async function generateOne(token, voice, person, figure, scene, text) {
  const createdAudio = await api("/create_audio_task", {
    method: "POST",
    token,
    body: {
      audio_man: voice.id,
      speed: 1,
      text: { text, plain_text: text },
    },
  });
  const audio = await waitAudio(token, createdAudio.data.task_id);
  const createdVideo = await api("/create_video", {
    method: "POST",
    token,
    body: {
      person: {
        id: person.id,
        figure_type: figure.type,
        width: figure.width,
        height: figure.height,
      },
      audio: {
        type: "audio",
        wav_url: audio.full.url,
        volume: 100,
      },
      screen_width: figure.width,
      screen_height: figure.height,
      hide_subtitle: true,
    },
  });
  const video = await waitVideo(token, createdVideo.data);

  const outDir = resolve(ROOT, "../_codex/sample");
  mkdirSync(outDir, { recursive: true });
  const mp4Path = resolve(outDir, "reminder_xiaoyan.mp4");
  const mp4Res = await fetch(video.video_url);
  if (!mp4Res.ok) throw new Error(`download HTTP ${mp4Res.status}`);
  writeFileSync(mp4Path, Buffer.from(await mp4Res.arrayBuffer()), { flag: "wx" });
  return { scene, text, audio_duration: audio.full.duration, video_duration: video.duration, saved_mp4: mp4Path, bytes_mp4: readFileSync(mp4Path).length };

}

async function main() {
  loadEnvLocal();
  if (!process.env.CHANJING_APP_ID || !process.env.CHANJING_SECRET_KEY) {
    throw new Error("missing credentials");
  }

  if (process.argv[2] !== "reminder" || process.argv.length !== 3) throw new Error("仅允许显式指定 reminder 样片");
  const output = resolve(ROOT, "../_codex/sample/reminder_xiaoyan.mp4");
  if (existsSync(output)) throw new Error("样片文件已存在，停止以免重复生成");
  const { getAvatarConfig } = await import("../src/lib/chanjing/avatar.ts");
  const avatar = getAvatarConfig();
  const text = "同学，下午两点了，政治马原错题回顾还没完成。先花四十分钟过一遍错题，做完回来打卡，学姐等你。";
  const tokenJson = await api("/access_token", {
    method: "POST", body: { app_id: process.env.CHANJING_APP_ID, secret_key: process.env.CHANJING_SECRET_KEY },
  });
  const token = tokenJson.data.access_token;
  if (!token) throw new Error("蝉镜未返回 access_token");
  const result = await generateOne(token, { id: avatar.audioManId }, { id: avatar.personId },
    { type: avatar.figureType, width: avatar.width, height: avatar.height }, "reminder", text);
  console.log(JSON.stringify({ person: avatar.personName, voice: avatar.audioName, result }, null, 2));

}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
