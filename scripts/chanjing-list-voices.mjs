import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "output", "avatars");
const TARGET_ID = "a6d13c6ccdf342d5a3f80a79218346e5";
const PAGE_SIZE = 100;
const TIMEOUT_MS = 15_000;

function loadEnv() {
  const file = resolve(ROOT, ".env.local");
  if (!existsSync(file)) throw new Error(".env.local missing");
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function request(path, token, body) {
  const base = (process.env.CHANJING_API_BASE || "https://open-api.chanjing.cc/open/v1").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json; charset=utf-8", ...(token ? { access_token: token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    const result = await response.json();
    if (result.code !== 0) {
      const error = new Error(`${path} code=${result.code} msg=${result.msg ?? ""} trace_id=${result.trace_id ?? ""}`);
      error.code = result.code; error.msg = result.msg; error.trace_id = result.trace_id;
      throw error;
    }
    return result;
  } finally { clearTimeout(timer); }
}

function pageInfo(data) {
  const info = data?.page_info || {};
  const total = Number(info.total_count ?? info.total ?? data?.total_count ?? data?.total);
  return { total: Number.isFinite(total) && total >= 0 ? total : null, pages: Number(info.total_page ?? info.total_pages ?? data?.total_page ?? data?.total_pages) || null };
}

function safeVoice(item) {
  const voice = { name: item.name ?? "", id: item.id ?? "", gender: item.gender ?? "" };
  for (const key of ["audio_preview_url", "preview_audio_url", "audio_url", "试听URL", "试听地址"]) {
    if (typeof item[key] === "string" && /^https?:\/\//i.test(item[key])) { voice.audition_url = item[key]; break; }
  }
  for (const key of ["audio_preview", "preview_audio", "audition", "demo_audio"]) {
    const value = item[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) { voice.audition_url ||= value; break; }
    if (value && typeof value.url === "string" && /^https?:\/\//i.test(value.url)) { voice.audition_url ||= value.url; break; }
  }
  return voice;
}

function isFemale(gender) { return /^(female|f|女|女性|女声)$/i.test(String(gender ?? "").trim()); }

async function allPages(token, endpoint, first) {
  const collected = [];
  const { total, pages } = pageInfo(first.data);
  let page = 1;
  let current = first;
  while (true) {
    if (!Array.isArray(current.data?.list)) throw new Error(`${endpoint} page=${page} missing data.list`);
    collected.push(...current.data.list);
    if (pages !== null ? page >= pages : total !== null ? collected.length >= total : current.data.list.length < PAGE_SIZE) break;
    page += 1;
    current = await request(`${endpoint}?page=${page}&size=${PAGE_SIZE}`, token);
  }
  return { list: collected, pages: page, apiTotal: total };
}

async function main() {
  loadEnv();
  const appId = process.env.CHANJING_APP_ID;
  const secret = process.env.CHANJING_SECRET_KEY;
  if (!appId || !secret) throw new Error("Missing CHANJING_APP_ID or CHANJING_SECRET_KEY");
  const auth = await request("/access_token", undefined, { app_id: appId, secret_key: secret });
  const token = auth.data?.access_token;
  if (!token) throw new Error("/access_token returned no access_token");

  const audioFirst = await request(`/list_common_audio?page=1&size=${PAGE_SIZE}`, token);
  const audio = await allPages(token, "/list_common_audio", audioFirst);
  const voices = audio.list.filter(item => isFemale(item.gender)).map(safeVoice);
  if (voices.length < 5) throw new Error(`Only ${voices.length} female voices found; refusing to write fewer than five candidates`);

  const dpFirst = await request(`/list_common_dp?page=1&size=${PAGE_SIZE}`, token);
  const people = await allPages(token, "/list_common_dp", dpFirst);
  const person = people.list.find(item => item.id === TARGET_ID);
  if (!person) throw new Error(`Target avatar ${TARGET_ID} not found in ${people.list.length} raw records`);
  const previousPerson = people.list.find(item => item.id === "1421df93d7754ee19dcaa18e85b68f39");
  const bundledId = person.audio_man_id || null;
  const bundled = bundledId ? voices.find(voice => voice.id === bundledId) : null;

  // Prefer a bundled avatar voice when its metadata confirms female gender.
  // Otherwise rank available female voices for a warm, encouraging graduate-school mentor.
  const ranked = [...voices].sort((a, b) => score(b.name) - score(a.name));
  const candidates = ranked.slice(0, 5);
  if (bundled && !candidates.some(voice => voice.id === bundled.id)) candidates[4] = bundled;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "voices.json"), `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
  const report = {
    avatar: { id: person.id, name: person.name, gender: person.gender, audio_man_id: bundledId, audio_name: person.audio_name ?? null },
    audio_inventory: { pages_fetched: audio.pages, api_total: audio.apiTotal, returned_count: audio.list.length, female_count: voices.length, page_size: PAGE_SIZE },
    avatar_inventory: { pages_fetched: people.pages, api_total: people.apiTotal, returned_count: people.list.length, page_size: PAGE_SIZE },
    selected_voice: bundledId
      ? (bundled ?? { id: bundledId, name: person.audio_name ?? "形象默认音色", gender: person.gender ?? "" })
      : candidates[0],
    selection_reason: bundled ? "优先使用晓妍-青春原始记录绑定的默认音色。" : "形象无可用默认音色；从完整女声音色列表中优先挑选名称带学姐、知心、温柔、亲切、陪伴等亲和语义的音色。",
    previous_preset_avatar: previousPerson ? { id: previousPerson.id, name: previousPerson.name, audio_man_id: previousPerson.audio_man_id ?? null, audio_name: previousPerson.audio_name ?? null } : null,
    candidates,
  };
  writeFileSync(resolve(OUT, "voices-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

function score(name = "") {
  const positive = [/学姐/, /知心/, /温柔/, /亲切/, /陪伴/, /甜美/, /温和/, /知性/, /女声/];
  const negative = [/客服/, /新闻/, /播报/, /营销/, /激情/, /严厉/, /测试/, /未命名/, /童声/];
  return positive.reduce((sum, pattern) => sum + Number(pattern.test(name)) * 3, 0)
    - negative.reduce((sum, pattern) => sum + Number(pattern.test(name)) * 2, 0)
    + Number(/[\u4e00-\u9fff]/.test(name));
}

main().catch(error => {
  console.error(JSON.stringify({ error: error.message, code: error.code ?? null, msg: error.msg ?? null, trace_id: error.trace_id ?? null }, null, 2));
  process.exitCode = 1;
});
