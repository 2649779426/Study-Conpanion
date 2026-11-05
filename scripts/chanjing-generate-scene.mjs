import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const API_BASE = () => (process.env.CHANJING_API_BASE || "https://open-api.chanjing.cc/open/v1").replace(/\/$/, "");
const OUT_DIR = resolve(ROOT, "../_codex/sample");
let journalPath;
let journal;

function record(update) {
  journal = { ...journal, ...update, updated_at: new Date().toISOString() };
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));
  console.log(JSON.stringify({ scene: journal.scene, stage: journal.stage }));
}

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
  // 请求前落盘，进程中断或响应不明时也禁止再次创建付费任务。
  record({ stage: "audio_request_started" });
  const createdAudio = await api("/create_audio_task", {
    method: "POST",
    token,
    body: {
      audio_man: voice.id,
      speed: 1,
      text: { text, plain_text: text },
    },
  });
  record({ stage: "audio_created", audio_task_id: createdAudio.data.task_id });
  const audio = await waitAudio(token, createdAudio.data.task_id);
  record({ stage: "video_request_started", audio_duration: audio.full.duration });
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
  record({ stage: "video_created", video_id: createdVideo.data });
  const video = await waitVideo(token, createdVideo.data);

  const mp4Path = resolve(OUT_DIR, `${scene}_xiaoyan.mp4`);
  const mp4Res = await fetch(video.video_url);
  if (!mp4Res.ok) throw new Error(`download HTTP ${mp4Res.status}`);
  writeFileSync(mp4Path, Buffer.from(await mp4Res.arrayBuffer()), { flag: "wx" });
  const result = { scene, text, audio_duration: audio.full.duration, video_duration: video.duration, saved_mp4: mp4Path, bytes_mp4: readFileSync(mp4Path).length };
  record({ stage: "completed", result });
  return result;

}

async function main() {
  loadEnvLocal();
  if (!process.env.CHANJING_APP_ID || !process.env.CHANJING_SECRET_KEY) {
    throw new Error("missing credentials");
  }

  const scene = process.argv[2];
  if (!["opening", "review"].includes(scene) || process.argv.length !== 3) throw new Error("第五轮仅允许显式指定 opening 或 review；reminder 必须复用已有样片");
  const output = resolve(OUT_DIR, `${scene}_xiaoyan.mp4`);
  journalPath = resolve(OUT_DIR, `${scene}_r5_generation.json`);
  if (existsSync(output) || existsSync(journalPath)) throw new Error("该场景已有文件或尝试记录，停止以免重复生成");
  for (const other of ["opening", "review"]) {
    const otherPath = resolve(OUT_DIR, `${other}_r5_generation.json`);
    if (existsSync(otherPath) && JSON.parse(readFileSync(otherPath, "utf8")).stage !== "completed") {
      throw new Error("第五轮已有失败或未完成的尝试，停止全部生成，不重试");
    }
  }
  const { getAvatarConfig } = await import("../src/lib/chanjing/avatar.ts");
  const avatar = getAvatarConfig();
  if (avatar.personId !== "a6d13c6ccdf342d5a3f80a79218346e5" || avatar.audioManId !== "C-CASE-25ae6403a1364c2ba88dad7aec4567c1") {
    throw new Error("当前配置不是已确认的晓妍-青春 / 带货小悦，停止生成");
  }
  // 从 seed.ts 读取该场景原文，避免维护两份生成话术。
  const seedSource = readFileSync(resolve(ROOT, "src/lib/seed.ts"), "utf8");
  const text = seedSource.match(new RegExp(`scene: "${scene}",[\\s\\S]*?content:\\s*"([^"\\n]+)"`))?.[1];
  if (!text) throw new Error("无法从 seed.ts 读取话术，停止生成");
  mkdirSync(OUT_DIR, { recursive: true });
  journal = { scene, text, person_id: avatar.personId, voice_id: avatar.audioManId, person: avatar.personName, voice: avatar.audioName, stage: "prepared" };
  writeFileSync(journalPath, JSON.stringify(journal, null, 2), { flag: "wx" });
  const tokenJson = await api("/access_token", {
    method: "POST", body: { app_id: process.env.CHANJING_APP_ID, secret_key: process.env.CHANJING_SECRET_KEY },
  });
  const token = tokenJson.data.access_token;
  if (!token) throw new Error("蝉镜未返回 access_token");
  const result = await generateOne(token, { id: avatar.audioManId }, { id: avatar.personId },
    { type: avatar.figureType, width: avatar.width, height: avatar.height }, scene, text);
  console.log(JSON.stringify({ person: avatar.personName, voice: avatar.audioName, result }, null, 2));

}

main().catch((err) => {
  if (journal) record({ stage: "failed", error: err.message });
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
