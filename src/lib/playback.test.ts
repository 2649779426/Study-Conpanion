import { describe, expect, it } from "vitest";
import { finalText, selectPlayback, videoHash } from "./playback";
import { createSeedStore } from "./seed";

describe("按最终文案选片", () => {
  it("种子原文才用预置视频", async () => {
    const text = createSeedStore().scripts[0].content;
    expect(await selectPlayback("opening", text, [])).toMatchObject({ kind: "preset", url: "/videos/opening.mp4" });
    expect((await selectPlayback("opening", text + "加油", [])).kind).toBe("tts");
    expect((await selectPlayback("review", text, [])).kind).toBe("tts");
  });
  it("替换称呼后不再使用说同学的旧视频", async () => {
    const text = finalText(createSeedStore().scripts[0].content, "小周");
    expect(text).toContain("小周你好");
    expect((await selectPlayback("opening", text, [])).kind).toBe("tts");
  });
  it("只播放场景与最终文本 hash 一致且已完成的本地视频", async () => {
    const hash = await videoHash("opening", "小周加油");
    const job = { jobId: "j1", scene: "opening" as const, text: "小周加油", hash, status: "completed" as const, url: `/generated/${hash}.mp4`, createdAt: "" };
    expect((await selectPlayback("opening", "小周加油", [job])).kind).toBe("generated");
    expect((await selectPlayback("opening", "小李加油", [job])).kind).toBe("tts");
    expect((await selectPlayback("review", "小周加油", [job])).kind).toBe("tts");
    expect((await selectPlayback("opening", "小周加油", [{ ...job, status: "video" }])).kind).toBe("tts");
    expect((await selectPlayback("opening", "小周加油", [{ ...job, url: "https://temporary/video.mp4" }])).kind).toBe("tts");
  });
});
