import "server-only";
import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { chanjingFetch } from "./client";
import { videoHash } from "../playback";
import type { ScriptScene, VideoJob } from "../types";

export const JOB_ROOT = join(process.cwd(), ".data", "chanjing");
export const VIDEO_ROOT = join(JOB_ROOT, "videos");
type Person = { id: string; name?: string; audio_man_id?: string; figures?: { type: string; width: number; height: number }[] };
type StoredJob = VideoJob & {
  audioTaskId: string;
  videoTaskId?: string;
  person: { id: string; figure_type: string; width: number; height: number };
  nextPollAt?: number;
};
const globalJobs = globalThis as typeof globalThis & { chanjingLocks?: Map<string, Promise<unknown>> };
const locks = globalJobs.chanjingLocks ??= new Map();
async function locked<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(work);
  locks.set(key, pending);
  try { return await pending; } finally { if (locks.get(key) === pending) locks.delete(key); }
}
async function persist(job: StoredJob) {
  await mkdir(JOB_ROOT, { recursive: true });
  const path = join(JOB_ROOT, `${job.jobId}.json`);
  await writeFile(`${path}.tmp`, JSON.stringify(job), "utf8");
  await rename(`${path}.tmp`, path);
}
async function readJob(id: string): Promise<StoredJob | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  try { return JSON.parse(await readFile(join(JOB_ROOT, `${id}.json`), "utf8")) as StoredJob; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
function publicJob(job: StoredJob): VideoJob {
  const { jobId, hash, scene, text, status, error, url, detail, createdAt } = job;
  return { jobId, hash, scene, text, status, error, url, detail, createdAt };
}
export async function getJob(id: string): Promise<VideoJob | null> {
  const job = await readJob(id);
  return job ? publicJob(job) : null;
}
export async function createJob(scene: ScriptScene, text: string): Promise<VideoJob> {
  const hash = await videoHash(scene, text);
  return locked(hash, async () => {
    const existing = await readJob(hash);
    if (existing && existing.status !== "failed") {
      if (existing.status !== "completed") return publicJob(existing);
      try { if ((await stat(join(VIDEO_ROOT, `${hash}.mp4`))).size > 0) return publicJob(existing); } catch { /* 缓存文件已移走时重新生成 */ }
    }
    const list = await chanjingFetch<{ list: Person[] }>("/list_common_dp?page=1&size=20");
    const person = list.data.list?.find(p => p.name === "文昊") ?? list.data.list?.[0];
    const figure = person?.figures?.find(f => f.type && f.width && f.height);
    if (!person || !figure) throw new Error("蝉镜没有可用的数字人形象");
    let voice = person.audio_man_id;
    if (!voice) {
      const voices = await chanjingFetch<{ list: { id: string; gender?: string }[] }>("/list_common_audio?page=1&size=50");
      voice = voices.data.list?.find(a => a.gender === "male")?.id ?? voices.data.list?.[0]?.id;
    }
    if (!voice) throw new Error("蝉镜没有可用的语音资源");
    const audio = await chanjingFetch<{ task_id: string }>("/create_audio_task", {
      method: "POST", body: JSON.stringify({ audio_man: voice, speed: 1, text: { text, plain_text: text } }),
    });
    if (!audio.data.task_id) throw new Error("蝉镜未返回语音任务 ID");
    const job: StoredJob = {
      jobId: hash, hash, scene, text, status: "queued", createdAt: new Date().toISOString(),
      audioTaskId: audio.data.task_id,
      person: { id: person.id, figure_type: figure.type, width: figure.width, height: figure.height },
    };
    await persist(job);
    return publicJob(job);
  });
}
/** 一次 GET 最多查询一次上游状态，不在路由里做长轮询；状态由 JSON 保留。 */
export async function advanceJob(id: string): Promise<VideoJob | null> {
  return locked(id, async () => {
    const job = await readJob(id);
    if (!job) return null;
    if (job.status === "completed" || job.status === "failed" || (job.nextPollAt ?? 0) > Date.now()) return publicJob(job);
    try {
      if (job.status === "queued" || job.status === "audio") {
        const audio = await chanjingFetch<{ status?: number; errMsg?: string; errReason?: string; full?: { url?: string } }>("/audio_task_state", {
          method: "POST", body: JSON.stringify({ task_id: job.audioTaskId }),
        });
        if (audio.data.errMsg || audio.data.errReason || (audio.data.status ?? 0) < 0) throw new Error(audio.data.errReason || audio.data.errMsg || "语音合成失败");
        job.status = "audio";
        if (audio.data.status === 9) {
          if (!audio.data.full?.url) throw new Error("语音已完成但没有音频地址");
          const video = await chanjingFetch<string>("/create_video", {
            method: "POST", body: JSON.stringify({
              person: job.person, audio: { type: "audio", wav_url: audio.data.full.url, volume: 100 },
              screen_width: job.person.width, screen_height: job.person.height, hide_subtitle: true,
            }),
          });
          if (typeof video.data !== "string" || !video.data) throw new Error("蝉镜未返回视频任务 ID");
          job.videoTaskId = video.data; job.status = "video";
        }
      } else {
        const result = await chanjingFetch<{ queue_status?: string; queue_desc?: string; msg?: string; video_url?: string }>(`/video?id=${encodeURIComponent(job.videoTaskId!)}`);
        const video = result.data;
        job.detail = video.queue_desc;
        if (video.queue_status === "failed" || video.queue_status === "other") throw new Error(video.msg || video.queue_desc || "视频合成失败");
        if (video.queue_status === "completed") {
          if (!video.video_url) throw new Error("视频已完成但没有下载地址");
          const response = await fetch(video.video_url, { signal: AbortSignal.timeout(90000), cache: "no-store" });
          if (!response.ok) throw new Error(`下载视频失败：HTTP ${response.status}`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.byteLength < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") throw new Error("下载内容不是有效 MP4 文件");
          await mkdir(VIDEO_ROOT, { recursive: true });
          const path = join(VIDEO_ROOT, `${job.hash}.mp4`);
          await writeFile(`${path}.tmp`, bytes);
          await rename(`${path}.tmp`, path);
          job.url = `/generated/${job.hash}.mp4`; job.status = "completed";
        }
      }
      job.nextPollAt = Date.now() + 5000;
    } catch (error) {
      job.status = "failed"; job.error = error instanceof Error ? error.message : "生成失败";
      delete job.url;
    }
    await persist(job);
    return publicJob(job);
  });
}
