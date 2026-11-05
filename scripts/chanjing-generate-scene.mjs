import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const API_BASE = "https://open-api.chanjing.cc/open/v1";

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
  const res = await fetch(`${API_BASE}${path}`, {
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

function pickMeaningful(list) {
  return [...list].sort((a, b) => {
    const score = (name = "") => {
      let s = 0;
      if (name && !/^未命名|test|测试|demo/i.test(name)) s += 2;
      if (/[\u4e00-\u9fff]/.test(name)) s += 2;
      if (name.length >= 2) s += 1;
      return s;
    };
    return score(b.name) - score(a.name);
  })[0];
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

  const outDir = resolve(ROOT, "public/videos");
  mkdirSync(outDir, { recursive: true });
  const mp4Path = resolve(outDir, `${scene}.mp4`);
  const wavPath = resolve(outDir, `${scene}.wav`);
  const mp4Res = await fetch(video.video_url);
  const wavRes = await fetch(audio.full.url);
  if (!mp4Res.ok || !wavRes.ok) throw new Error(`download failed for ${scene}`);
  writeFileSync(mp4Path, Buffer.from(await mp4Res.arrayBuffer()));
  writeFileSync(wavPath, Buffer.from(await wavRes.arrayBuffer()));

  return {
    scene,
    text,
    audio_duration: audio.full.duration,
    video_duration: video.duration,
    saved_mp4: `public/videos/${scene}.mp4`,
    saved_wav: `public/videos/${scene}.wav`,
    bytes_mp4: readFileSync(mp4Path).length,
  };
}

async function main() {
  loadEnvLocal();
  if (!process.env.CHANJING_APP_ID || !process.env.CHANJING_SECRET_KEY) {
    throw new Error("missing credentials");
  }

  const scenes = {
    opening:
      "同学你好，我是你的考研督学学长。今天按计划推进，先从英语阅读开始。打开任务，打卡跟上节奏，我们一起把今天拿下。",
    reminder:
      "提醒一下：今天该完成英语单词与阅读任务了。别拖延，完成后记得打卡。坚持住，离目标又近一步。",
    review:
      "今天辛苦了。回顾一下已完成的任务，未完成的拆到明天。睡前把错题看一眼，明天继续稳步推进。",
  };

  const only = process.argv[2];
  const entries = Object.entries(scenes).filter(([k]) => !only || k === only);
  if (!entries.length) throw new Error("no scene selected");

  const tokenJson = await api("/access_token", {
    method: "POST",
    body: {
      app_id: process.env.CHANJING_APP_ID,
      secret_key: process.env.CHANJING_SECRET_KEY,
    },
  });
  const token = tokenJson.data.access_token;

  const audioList = await api("/list_common_audio?page=1&size=50", { token });
  const dpList = await api("/list_common_dp?page=1&size=50", { token });
  // Younger 学长: prefer sit_body 海城-休闲 (stable) + young voice 轻快男声/专业小哥
  // Avoid whole_body-only avatars that often fail video render on this account.
  const preferred = [
    { name: "海城-休闲", figureType: "sit_body" },
    { name: "文昊", figureType: "sit_body" },
  ];
  let person = null;
  let figure = null;
  for (const pref of preferred) {
    const p = (dpList.data.list || []).find((x) => x.name === pref.name);
    const f = (p?.figures || []).find(
      (fig) => fig.type === pref.figureType && fig.width && fig.height,
    );
    if (p && f) {
      person = p;
      figure = f;
      break;
    }
  }
  if (!person) person = pickMeaningful(dpList.data.list || []);
  if (!figure) {
    figure =
      (person.figures || []).find((f) => f.type === "sit_body" && f.width && f.height) ||
      (person.figures || []).find((f) => f.type && f.width && f.height) ||
      person.figures?.[0];
  }
  if (!figure?.type || !figure.width || !figure.height) {
    throw new Error("figure incomplete");
  }

  const youngVoice =
    (audioList.data.list || []).find((a) => a.name === "轻快男声") ||
    (audioList.data.list || []).find((a) => a.name === "专业小哥") ||
    (audioList.data.list || []).find((a) => a.name === "科普男声") ||
    (audioList.data.list || []).find((a) => a.id === person.audio_man_id);
  const voice = youngVoice
    ? { id: youngVoice.id, name: youngVoice.name }
    : person.audio_man_id
      ? { id: person.audio_man_id, name: person.audio_name || "young-tutor" }
      : null;
  if (!voice?.id) throw new Error("no matching young voice");

  const results = [];
  for (const [scene, text] of entries) {
    // sequential to avoid parallel billing/concurrency issues
    results.push(await generateOne(token, voice, person, figure, scene, text));
  }

  console.log(
    JSON.stringify(
      {
        voice_name: voice.name,
        voice_id: voice.id,
        person_name: person.name,
        person_gender: person.gender,
        figure_type: figure.type,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
