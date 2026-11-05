import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "..", "_codex", "avatars");
const API_BASE = "https://open-api.chanjing.cc/open/v1";
const MAX_ITEMS = 200;
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

async function api(path, { body, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json; charset=utf-8", ...(token ? { access_token: token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function safePreview(item) {
  // Listing API returns cover assets inside figures; also accept top-level variants.
  const keys = ["preview_url", "preview", "cover_url", "cover", "thumbnail_url", "thumbnail", "image_url", "image"];
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return { [key]: value };
    if (value && typeof value === "object") {
      for (const subkey of ["url", "src", "image_url"]) {
        if (typeof value[subkey] === "string" && /^https?:\/\//i.test(value[subkey])) return { [key]: value[subkey] };
      }
    }
  }
  return {};
}

function buildContactSheet(entries, outputPath) {
  if (!entries.length) return false;
  const temp = join(OUT, `contact-work-${randomUUID()}`);
  mkdirSync(temp, { recursive: true });
    const renderGrid = (batch, path, labelPrefix) => {
      const args = [];
      for (const entry of batch) args.push("-i", entry.path);
      const cells = batch.map((entry, i) => {
        const labelFile = `${labelPrefix}-${String(i + 1).padStart(3, "0")}.txt`;
        writeFileSync(join(temp, labelFile), entry.name.replace(/[\r\n]/g, " "), "utf8");
        return `[${i}:v]scale=220:270:force_original_aspect_ratio=decrease,pad=220:300:(ow-iw)/2:(oh-ih)/2:white,drawtext=fontfile='C\\:/Windows/Fonts/msyh.ttc':textfile='${labelFile}':fontcolor=black:fontsize=20:x=(w-text_w)/2:y=274[v${i}]`;
      });
      const layout = batch.map((_, i) => `${(i % 5) * 228}_${Math.floor(i / 5) * 310}`).join("|");
      const inputs = batch.map((_, i) => `[v${i}]`).join("");
      const stack = batch.length === 1 ? "[v0]null[out]" : `${inputs}xstack=inputs=${batch.length}:layout=${layout}:fill=white[out]`;
      args.push("-filter_complex", `${cells.join(";")};${stack}`, "-map", "[out]", "-frames:v", "1", "-y", path);
      const result = spawnSync("ffmpeg", args, { encoding: "utf8", timeout: 120_000, windowsHide: true, cwd: temp });
      return result.status === 0 && existsSync(path);
    };
    // Keep scratch labels and intermediate grids inside avatars/contact-work-*.
    // xstack is limited to fewer inputs in some ffmpeg builds; compose groups of 50.
    const grids = [];
    for (let start = 0; start < entries.length; start += 50) {
      const grid = join(temp, `grid-${grids.length + 1}.jpg`);
      if (!renderGrid(entries.slice(start, start + 50), grid, `batch-${grids.length + 1}`)) return false;
      grids.push(grid);
    }
    if (grids.length === 1) {
      const copy = spawnSync("ffmpeg", ["-i", grids[0], "-frames:v", "1", "-y", outputPath], { encoding: "utf8", timeout: 30_000, windowsHide: true });
      return copy.status === 0 && existsSync(outputPath);
    }
    const args = [];
    for (const grid of grids) args.push("-i", grid);
    const inputs = grids.map((_, i) => `[${i}:v]`).join("");
    const layout = grids.map((_, i) => `${(i % 2) * 1150}_${Math.floor(i / 2) * 3110}`).join("|");
    args.push("-filter_complex", `${inputs}xstack=inputs=${grids.length}:layout=${layout}:fill=white[out]`, "-map", "[out]", "-frames:v", "1", "-y", outputPath);
    const result = spawnSync("ffmpeg", args, { encoding: "utf8", timeout: 60_000, windowsHide: true });
    return result.status === 0 && existsSync(outputPath);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (process.argv.includes("--test-contact")) {
    const sample = resolve(ROOT, "public", "avatar.png");
    const ok = buildContactSheet([
      { path: sample, name: "头像样例一" },
      { path: sample, name: "头像样例二" },
    ], resolve(OUT, "test-contact.jpg"));
    console.log(JSON.stringify({ contactSheetTest: ok, output: "../_codex/avatars/test-contact.jpg" }));
    return;
  }
  if (process.argv.includes("--rebuild-contact")) {
    const avatars = JSON.parse(readFileSync(resolve(OUT, "avatars.json"), "utf8"));
    const files = readdirSync(OUT);
    const entries = avatars.map((avatar, i) => {
      const stem = `preview-${String(i + 1).padStart(3, "0")}.`;
      const file = files.find((name) => name.startsWith(stem));
      return { path: file ? resolve(OUT, file) : "", name: String(avatar?.name || `未命名${i + 1}`) };
    }).filter((entry) => entry.path && existsSync(entry.path));
    const ok = buildContactSheet(entries, resolve(OUT, "contact.jpg"));
    const reportPath = resolve(OUT, "REPORT.md");
    let report = readFileSync(reportPath, "utf8").replace(/Contact sheet created: (yes|no)/, `Contact sheet created: ${ok ? "yes" : "no"}`).replace(/Errors: .*/, `Errors: ${ok ? "none" : "Contact sheet creation failed; downloaded previews retained"}`);
    if (!report.includes("Preview-related response fields observed:")) {
      report = report.replace("- Contact sheet created:", "- Preview-related response fields observed: item.audio_preview; figures[].cover; figures[].preview_video_url\n- Cover field exported: figures[].cover\n- Contact sheet created:");
    }
    writeFileSync(reportPath, report, "utf8");
    console.log(JSON.stringify({ contactSheet: ok, previews: entries.length, output: "../_codex/avatars/contact.jpg" }));
    return;
  }
  const status = { ok: false, count: 0, apiTotal: null, previews: 0, contactSheet: false, errors: [] };
  try {
    loadEnv();
    const appId = process.env.CHANJING_APP_ID;
    const secret = process.env.CHANJING_SECRET_KEY;
    if (!appId || !secret) throw new Error("Missing CHANJING_APP_ID or CHANJING_SECRET_KEY");
    // Strict endpoint allowlist: this script cannot call generation endpoints.
    const auth = await api("/access_token", { body: { app_id: appId, secret_key: secret } });
    const token = auth?.data?.access_token;
    if (auth?.code !== 0 || !token) throw new Error(`access_token failed (code=${auth?.code ?? "unknown"})`);
    const avatars = [];
    const seenIds = new Set();
    let emptyPageStreak = 0;
    let page = 1;
    while (avatars.length < MAX_ITEMS && emptyPageStreak < 2) {
      const size = 20;
      const result = await api(`/list_common_dp?page=${page}&size=${size}`, { token });
      if (result?.code !== 0) throw new Error(`list_common_dp failed (code=${result?.code ?? "unknown"})`);
      const list = result?.data?.list;
      if (!Array.isArray(list)) throw new Error("list_common_dp returned no list");
      const info = result?.data?.page_info;
      if (Number.isFinite(Number(info?.total_count))) status.apiTotal = Number(info.total_count);
      let added = 0;
      for (const item of list) {
        const key = String(item?.id ?? "");
        if (!key || seenIds.has(key)) continue;
        seenIds.add(key);
        const figures = Array.isArray(item.figures) ? item.figures.map((f) => ({
          ...(f?.type !== undefined ? { type: f.type } : {}),
          ...(f?.width !== undefined ? { width: f.width } : {}),
          ...(f?.height !== undefined ? { height: f.height } : {}),
          ...(typeof f?.cover === "string" && /^https?:\/\//i.test(f.cover) ? { cover: f.cover } : {}),
          ...(typeof f?.preview_video_url === "string" && /^https?:\/\//i.test(f.preview_video_url) ? { preview_video_url: f.preview_video_url } : {}),
        })) : [];
        avatars.push({
          ...(item?.name !== undefined ? { name: item.name } : {}),
          ...(item?.id !== undefined ? { id: item.id } : {}),
          ...(item?.gender !== undefined ? { gender: item.gender } : {}),
          figures,
        });
        // Include top-level preview fields when present, without leaking unrelated API data.
        Object.assign(avatars[avatars.length - 1], safePreview(item));
        added += 1;
        if (avatars.length >= MAX_ITEMS) break;
      }
      emptyPageStreak = added ? 0 : emptyPageStreak + 1;
      const totalReached = status.apiTotal !== null && seenIds.size >= status.apiTotal;
      if (totalReached || list.length === 0) break;
      page += 1;
    }
    writeFileSync(resolve(OUT, "avatars.json"), `${JSON.stringify(avatars, null, 2)}\n`, "utf8");
    status.count = avatars.length;
    const entries = [];
    const savedPreviewFiles = readdirSync(OUT);
    for (let i = 0; i < avatars.length; i += 1) {
      const url = avatars[i].figures?.find((figure) => figure.cover)?.cover || Object.values(safePreview(avatars[i]))[0];
      if (!url) continue;
      const prefix = `preview-${String(i + 1).padStart(3, "0")}.`;
      const savedFile = savedPreviewFiles.find((name) => name.startsWith(prefix));
      if (savedFile) {
        entries.push({ path: resolve(OUT, savedFile), name: String(avatars[i].name || `未命名${i + 1}`).replace(/[\\/:*?"<>|]/g, "_") });
        continue;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let response;
        let bytes;
        try {
          response = await fetch(url, { signal: controller.signal });
          if (!response.ok) continue;
          const type = response.headers.get("content-type") || "";
          const announcedSize = Number(response.headers.get("content-length") || 0);
          if (!type.startsWith("image/") || announcedSize > 15 * 1024 * 1024) continue;
          bytes = Buffer.from(await response.arrayBuffer());
        } finally { clearTimeout(timer); }
        const type = response.headers.get("content-type") || "";
        if (!bytes.length || bytes.length > 15 * 1024 * 1024) continue;
        const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[type.split(";")[0]] || "img";
        const imagePath = resolve(OUT, `preview-${String(i + 1).padStart(3, "0")}.${extension}`);
        writeFileSync(imagePath, bytes);
        entries.push({ path: imagePath, name: String(avatars[i].name || `未命名${i + 1}`).replace(/[\\/:*?"<>|]/g, "_") });
      } catch { /* preview download is best effort */ }
    }
    status.previews = entries.length;
    if (entries.length) status.contactSheet = buildContactSheet(entries, resolve(OUT, "contact.jpg"));
    if (entries.length && !status.contactSheet) status.errors.push("Contact sheet creation failed; downloaded previews retained");
    status.ok = true;
    if (!entries.length) status.errors.push("No usable preview cover fields or downloadable preview images found");
  } catch (error) {
    status.errors.push(String(error?.message || "unknown error").replace(/access_token[^\s]*/gi, "access_token [redacted]"));
  }
  writeFileSync(resolve(OUT, "REPORT.md"), [
    "# Avatar listing report", "", `- Result: ${status.ok ? "success" : "partial/failed"}`, `- Avatars exported: ${status.count}`, `- API total_count reported: ${status.apiTotal ?? "unavailable"}`, `- Preview images downloaded: ${status.previews}`, `- Contact sheet created: ${status.contactSheet ? "yes" : "no"}`, `- Preview-related response fields observed: item.audio_preview; figures[].cover; figures[].preview_video_url`, `- Figure preview fields exported: figures[].cover and figures[].preview_video_url`, `- Contact sheet scratch files: retained under avatars/contact-work-*`, `- API calls: /access_token and paginated /list_common_dp only`, `- Generation endpoints called: none`, `- Errors: ${status.errors.length ? status.errors.join("; ") : "none"}`, "",
  ].join("\n"), "utf8");
  console.log(JSON.stringify({ ...status, outputDirectory: "../_codex/avatars" }));
}

main().catch(() => { process.exitCode = 1; });
