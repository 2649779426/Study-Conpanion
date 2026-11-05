import { afterEach, beforeEach, expect, it, vi } from "vitest";

const disk = vi.hoisted(() => new Map<string, string | Uint8Array>());
vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({
  mkdir: async () => undefined,
  readFile: async (path: string) => { if (!disk.has(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" }); return disk.get(path); },
  writeFile: async (path: string, data: string | Uint8Array) => { disk.set(path, data); },
  rename: async (from: string, to: string) => { if (!disk.has(from)) throw new Error("missing"); disk.set(to, disk.get(from)!); disk.delete(from); },
  stat: async (path: string) => { if (!disk.has(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" }); return { size: disk.get(path)!.length }; },
}));

import { createJob, advanceJob, getJob } from "./jobs";

beforeEach(() => {
  disk.clear(); vi.stubEnv("CHANJING_APP_ID", "test-app"); vi.stubEnv("CHANJING_SECRET_KEY", "test-key");
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T02:00:00Z"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

function apiMock(options: { audioFail?: boolean; videoFail?: boolean; downloadFail?: boolean } = {}) {
  let videoPolls = 0;
  const call = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://media.test/generated.mp4") return options.downloadFail ? new Response("down", { status: 502 }) : new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]), { headers: { "Content-Type": "video/mp4" } });
    const path = new URL(url).pathname;
    let data: unknown;
    if (path.endsWith("/access_token")) data = { access_token: "token", expire_in: 9999999999 };
    else if (path.endsWith("/list_common_dp")) data = { list: [{ id: "p1", name: "文昊", audio_man_id: "voice1", figures: [{ type: "normal", width: 720, height: 1280 }] }] };
    else if (path.endsWith("/list_common_audio")) data = { list: [{ id: "voice1", name: "男声", gender: "male" }] };
    else if (path.endsWith("/create_audio_task")) {
      expect(JSON.parse(String(init?.body)).text.plain_text).toBe("小周你好");
      data = { task_id: "audio1" };
    } else if (path.endsWith("/audio_task_state")) data = options.audioFail
      ? { status: -1, errReason: "语音资源不可用" } : { status: 9, full: { url: "https://media.test/audio.wav", duration: 2 } };
    else if (path.endsWith("/create_video")) {
      expect(JSON.parse(String(init?.body)).audio.wav_url).toBe("https://media.test/audio.wav");
      data = "video1";
    } else if (path.endsWith("/video")) {
      videoPolls++;
      data = options.videoFail ? { queue_status: "failed", msg: "合成失败" } : videoPolls === 1
        ? { queue_status: "processing", queue_desc: "正在合成" }
        : { queue_status: "completed", video_url: "https://media.test/generated.mp4", duration: 2 };
    } else throw new Error(`unexpected URL ${url}`);
    return Response.json({ code: 0, data });
  });
  vi.stubGlobal("fetch", call);
  return call;
}

it("POST 只创建语音任务，后续 GET 推进且视频下载成功才完成；重读保留状态", async () => {
  const fetcher = apiMock();
  const job = await createJob("opening", "小周你好");
  expect(job.status).toBe("queued");
  expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/audio_task_state"))).toBe(false);
  expect((await getJob(job.jobId))?.text).toBe("小周你好");
  expect((await advanceJob(job.jobId))?.status).toBe("video");
  vi.advanceTimersByTime(6000);
  expect((await advanceJob(job.jobId))?.status).toBe("video");
  vi.advanceTimersByTime(6000);
  const done = await advanceJob(job.jobId);
  expect(done?.status).toBe("completed");
  expect(done?.url).toBe(`/generated/${job.hash}.mp4`);
  expect(Array.from(disk.keys()).some(p => p.endsWith(`${job.hash}.mp4`))).toBe(true);
  expect((await getJob(job.jobId))?.status).toBe("completed");
  vi.resetModules();
  const reloaded = await import("./jobs");
  expect((await reloaded.getJob(job.jobId))?.url).toBe(`/generated/${job.hash}.mp4`);
});
it.each([{ audioFail: true }, { videoFail: true }, { downloadFail: true }])("真实错误保留失败原因，不能伪造成功 %j", async options => {
  apiMock(options);
  const job = await createJob("opening", "小周你好");
  for (let i = 0; i < 4; i++) { vi.advanceTimersByTime(6000); await advanceJob(job.jobId); }
  const result = await getJob(job.jobId);
  expect(result?.status).toBe("failed");
  expect(result?.error).toBeTruthy();
  expect(result?.url).toBeUndefined();
});
it("并发创建相同文案复用任务，并发查询不重复创建视频", async () => {
  const fetcher = apiMock();
  const [a, b] = await Promise.all([createJob("opening", "小周你好"), createJob("opening", "小周你好")]);
  expect(a.jobId).toBe(b.jobId);
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/create_audio_task"))).toHaveLength(1);
  await Promise.all([advanceJob(a.jobId), advanceJob(a.jobId)]);
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/create_video"))).toHaveLength(1);
});
