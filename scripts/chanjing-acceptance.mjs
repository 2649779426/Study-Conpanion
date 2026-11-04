import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const API_BASE = "https://open-api.chanjing.cc/open/v1";

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) {
    throw new Error(".env.local missing; configure CHANJING_APP_ID and CHANJING_SECRET_KEY");
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function configured(name) {
  return Boolean(process.env[name]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (token) headers.access_token = token;
  const started = Date.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  const elapsedMs = Date.now() - started;
  return { httpStatus: res.status, elapsedMs, json };
}

function assertOk(step, result) {
  const { json, elapsedMs } = result;
  const summary = {
    step,
    path: step,
    code: json.code,
    trace_id: json.trace_id ?? null,
    elapsedMs,
    msg: json.msg ?? null,
  };
  if (json.code !== 0) {
    const err = new Error(
      `${step} business failed code=${json.code} msg=${json.msg ?? ""} trace_id=${json.trace_id ?? ""}`,
    );
    err.summary = summary;
    err.json = json;
    throw err;
  }
  return summary;
}

function pickMeaningfulName(list, label) {
  const scored = [...list].map((item) => {
    const name = String(item.name || "");
    let score = 0;
    if (name && !/^未命名|test|测试|demo/i.test(name)) score += 2;
    if (/[\u4e00-\u9fff]/.test(name)) score += 2;
    if (name.length >= 2) score += 1;
    return { item, score, name };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 2) {
    throw new Error(`No meaningful ${label} name found in list`);
  }
  return best.item;
}

async function pollAudio(token, taskId) {
  let interval = 3000;
  const deadline = Date.now() + 5 * 60 * 1000;
  let last = null;
  while (Date.now() < deadline) {
    const result = await api("/audio_task_state", {
      method: "POST",
      token,
      body: { task_id: taskId },
    });
    assertOk("/audio_task_state", result);
    last = result.json.data;
    const errMsg = last?.errMsg || "";
    const errReason = last?.errReason || "";
    if (errMsg || errReason) {
      const err = new Error("TTS task failed");
      err.details = { errMsg, errReason, status: last?.status, trace_id: result.json.trace_id };
      throw err;
    }
    if (last?.status === 9 && last?.full?.url) {
      return { data: last, trace_id: result.json.trace_id, elapsedMs: result.elapsedMs };
    }
    await sleep(interval);
    interval = Math.min(interval * 2, 10000);
  }
  const err = new Error("TTS polling timeout");
  err.details = {
    status: last?.status ?? null,
    errMsg: last?.errMsg ?? null,
    errReason: last?.errReason ?? null,
  };
  throw err;
}

async function pollVideo(token, videoId) {
  let interval = 5000;
  const deadline = Date.now() + 20 * 60 * 1000;
  let last = null;
  let lastTrace = null;
  while (Date.now() < deadline) {
    const result = await api(`/video?id=${encodeURIComponent(videoId)}`, {
      method: "GET",
      token,
    });
    assertOk("/video", result);
    last = result.json.data;
    lastTrace = result.json.trace_id;
    const qs = last?.queue_status;
    if (qs === "completed" && last?.video_url) {
      return { data: last, trace_id: lastTrace, elapsedMs: result.elapsedMs };
    }
    if (qs === "failed") {
      const err = new Error("Video task failed");
      err.details = { msg: last?.msg ?? null, queue_status: qs, trace_id: lastTrace };
      throw err;
    }
    if (qs === "other") {
      const err = new Error("Video queue_status=other");
      err.details = {
        queue_status: qs,
        msg: last?.msg ?? null,
        queue_desc: last?.queue_desc ?? null,
        trace_id: lastTrace,
      };
      throw err;
    }
    await sleep(interval);
    interval = Math.min(interval * 2, 15000);
  }
  const err = new Error("Video polling timeout");
  err.details = {
    queue_status: last?.queue_status ?? null,
    msg: last?.msg ?? null,
    queue_desc: last?.queue_desc ?? null,
    trace_id: lastTrace,
  };
  throw err;
}

async function checkUrl(url) {
  const res = await fetch(url, { method: "GET" });
  const len = Number(res.headers.get("content-length") || "0");
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    contentLengthHeader: len,
    bytes: buf.byteLength,
    ok: res.status === 200 && buf.byteLength > 0,
  };
}

async function main() {
  loadEnvLocal();
  if (!configured("CHANJING_APP_ID") || !configured("CHANJING_SECRET_KEY")) {
    console.error("BLOCKED: missing CHANJING_APP_ID or CHANJING_SECRET_KEY");
    process.exit(2);
  }

  const report = [];
  const startedAll = Date.now();

  // 1) access_token
  const tokenRes = await api("/access_token", {
    method: "POST",
    body: {
      app_id: process.env.CHANJING_APP_ID,
      secret_key: process.env.CHANJING_SECRET_KEY,
    },
  });
  const tokenSummary = assertOk("/access_token", tokenRes);
  const accessToken = tokenRes.json.data.access_token;
  const expireIn = tokenRes.json.data.expire_in;
  report.push({
    ...tokenSummary,
    expire_in_present: typeof expireIn === "number",
    token_acquired: Boolean(accessToken),
  });

  // 2) list_common_audio
  const audioListRes = await api("/list_common_audio?page=1&size=20", {
    token: accessToken,
  });
  const audioListSummary = assertOk("/list_common_audio", audioListRes);
  const audioList = audioListRes.json.data?.list || [];
  const voice = pickMeaningfulName(audioList, "audio");
  report.push({
    ...audioListSummary,
    selected_audio_name: voice.name,
    selected_audio_id: voice.id,
    list_count: audioList.length,
  });

  // 3) create_audio_task
  const ttsText = "这是一条蝉镜开放平台接入验收语音。";
  const createAudioRes = await api("/create_audio_task", {
    method: "POST",
    token: accessToken,
    body: {
      audio_man: voice.id,
      speed: 1,
      text: {
        text: ttsText,
        plain_text: ttsText,
      },
    },
  });
  const createAudioSummary = assertOk("/create_audio_task", createAudioRes);
  const audioTaskId = createAudioRes.json.data.task_id;
  report.push({
    ...createAudioSummary,
    task_id: audioTaskId,
  });

  // 4) poll TTS
  const audioDone = await pollAudio(accessToken, audioTaskId);
  const audioUrl = audioDone.data.full.url;
  const audioDuration = audioDone.data.full.duration;
  report.push({
    step: "/audio_task_state",
    path: "/audio_task_state",
    code: 0,
    trace_id: audioDone.trace_id,
    status: audioDone.data.status,
    audio_duration: audioDuration,
    audio_url: audioUrl,
  });

  // 5) list_common_dp
  const dpRes = await api("/list_common_dp?page=1&size=20", {
    token: accessToken,
  });
  const dpSummary = assertOk("/list_common_dp", dpRes);
  const dpList = dpRes.json.data?.list || [];
  const person = pickMeaningfulName(dpList, "digital person");
  const figure =
    (person.figures || []).find((f) => f.type && f.width && f.height) ||
    (person.figures || [])[0];
  if (!figure?.type || !figure?.width || !figure?.height) {
    throw new Error("Selected digital person has no usable figure type/width/height");
  }
  report.push({
    ...dpSummary,
    selected_person_name: person.name,
    selected_person_id: person.id,
    figure_type: figure.type,
    figure_width: figure.width,
    figure_height: figure.height,
  });

  // 6) create_video
  const createVideoRes = await api("/create_video", {
    method: "POST",
    token: accessToken,
    body: {
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
    },
  });
  const createVideoSummary = assertOk("/create_video", createVideoRes);
  const videoTaskId = createVideoRes.json.data;
  if (typeof videoTaskId !== "string" || !videoTaskId) {
    throw new Error("create_video data is not a task id string");
  }
  report.push({
    ...createVideoSummary,
    task_id: videoTaskId,
  });

  // 7) poll video
  const videoDone = await pollVideo(accessToken, videoTaskId);
  const videoUrl = videoDone.data.video_url;
  const videoDuration = videoDone.data.duration;
  report.push({
    step: "/video",
    path: "/video",
    code: 0,
    trace_id: videoDone.trace_id,
    queue_status: videoDone.data.queue_status,
    video_duration: videoDuration,
    video_url: videoUrl,
    msg: videoDone.data.msg ?? null,
    queue_desc: videoDone.data.queue_desc ?? null,
  });

  // 8) acceptance checks
  const audioCheck = await checkUrl(audioUrl);
  const videoCheck = await checkUrl(videoUrl);
  const durationDiff = Math.abs(Number(videoDuration) - Number(audioDuration));
  const durationOk = durationDiff <= 2;

  const acceptance = {
    audio_http_ok: audioCheck.ok,
    audio_status: audioCheck.status,
    audio_bytes: audioCheck.bytes,
    video_http_ok: videoCheck.ok,
    video_status: videoCheck.status,
    video_bytes: videoCheck.bytes,
    audio_duration: audioDuration,
    video_duration: videoDuration,
    duration_diff_sec: durationDiff,
    duration_close: durationOk,
    passed:
      audioCheck.ok && videoCheck.ok && durationOk,
    note: "URLs are temporary; transfer/persist ASAP",
    total_elapsed_ms: Date.now() - startedAll,
  };

  console.log(
    JSON.stringify(
      {
        report,
        acceptance,
        final_audio_url: audioUrl,
        final_video_url: videoUrl,
      },
      null,
      2,
    ),
  );

  if (!acceptance.passed) process.exit(1);
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      {
        error: err.message,
        details: err.details || err.summary || null,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
