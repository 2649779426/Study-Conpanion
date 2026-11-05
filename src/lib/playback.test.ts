import { describe, expect, it } from "vitest";
import { finalText, selectPlayback, videoHash } from "./playback";
import { createSeedStore } from "./seed";
import { PRESET_AVATAR } from "./chanjing/identity";

describe("按最终文案选片", () => {
  it("换形象或换音色后，即使场景和文案相同也不能复用生成视频", async () => {
    const avatar = { personId: "person-a", audioManId: "voice-a" };
    const hash = await videoHash("opening", "小周加油", avatar);
    const job = { jobId: hash, scene: "opening" as const, text: "小周加油", hash, status: "completed" as const, url: `/generated/${hash}.mp4`, createdAt: "" };
    expect(await videoHash("opening", "小周加油", { ...avatar, personId: "person-b" })).not.toBe(hash);
    expect(await videoHash("opening", "小周加油", { ...avatar, audioManId: "voice-b" })).not.toBe(hash);
    expect((await selectPlayback("opening", "小周加油", [job], avatar)).kind).toBe("generated");
    expect((await selectPlayback("opening", "小周加油", [job], { ...avatar, personId: "person-b" })).kind).toBe("tts");
    expect((await selectPlayback("opening", "小周加油", [job], { ...avatar, audioManId: "voice-b" })).kind).toBe("tts");
  });
  it("种子文案相同但预置形象不符时不能播放旧预置视频", async () => {
    const text = createSeedStore().scripts[0].content;
    expect((await selectPlayback("opening", text, [], { personId: "a6d13c6ccdf342d5a3f80a79218346e5", audioManId: "female-voice" })).kind).toBe("tts");
  });
  it("种子原文才用预置视频", async () => {
    const text = createSeedStore().scripts[0].content;
    expect(await selectPlayback("opening", text, [], PRESET_AVATAR)).toMatchObject({ kind: "preset", url: "/videos/opening.mp4", poster: "/videos/opening.jpg" });
    expect((await selectPlayback("opening", text + "加油", [], PRESET_AVATAR)).kind).toBe("tts");
    expect((await selectPlayback("review", text, [], PRESET_AVATAR)).kind).toBe("tts");
    expect((await selectPlayback("opening", text, [], { ...PRESET_AVATAR, audioManId: "another-voice" })).kind).toBe("tts");
    expect((await selectPlayback("opening", text, [], null)).kind).toBe("tts");
  });
  it("替换称呼后不再使用说同学的旧视频", async () => {
    const text = finalText(createSeedStore().scripts[0].content, "小周");
    expect(text).toContain("小周你好");
    expect((await selectPlayback("opening", text, [], PRESET_AVATAR)).kind).toBe("tts");
  });
  it("只播放场景与最终文本 hash 一致且已完成的本地视频", async () => {
    const hash = await videoHash("opening", "小周加油", PRESET_AVATAR);
    const job = { jobId: "j1", scene: "opening" as const, text: "小周加油", hash, status: "completed" as const, url: `/generated/${hash}.mp4`, createdAt: "" };
    expect((await selectPlayback("opening", "小周加油", [job], PRESET_AVATAR)).kind).toBe("generated");
    expect((await selectPlayback("opening", "小周加油", [{ ...job, poster: `/generated/${hash}.jpg` }], PRESET_AVATAR)).poster).toBe(`/generated/${hash}.jpg`);
    expect((await selectPlayback("opening", "小周加油", [job], PRESET_AVATAR)).poster).toBeUndefined();
    expect((await selectPlayback("opening", "小李加油", [job], PRESET_AVATAR)).kind).toBe("tts");
    expect((await selectPlayback("review", "小周加油", [job], PRESET_AVATAR)).kind).toBe("tts");
    expect((await selectPlayback("opening", "小周加油", [{ ...job, status: "video" }], PRESET_AVATAR)).kind).toBe("tts");
    expect((await selectPlayback("opening", "小周加油", [{ ...job, url: "https://temporary/video.mp4" }], PRESET_AVATAR)).kind).toBe("tts");
  });
});
