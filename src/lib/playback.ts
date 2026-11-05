import { createSeedStore } from "./seed";
import type { ScriptScene, VideoJob } from "./types";
import { PRESET_AVATAR, type AvatarIdentity } from "./chanjing/identity";

export function finalText(content: string, userName: string): string {
  return content.replace(/同学/g, userName.trim() || "同学");
}
/** 浏览器与 Node 使用同一个 SHA-256，避免服务端和播放器的匹配口径不同。 */
export async function videoHash(scene: ScriptScene, text: string, avatar: AvatarIdentity): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([scene, text, avatar.personId, avatar.audioManId])));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export type PlaybackSource = { kind: "preset" | "generated" | "tts"; label: string; url?: string; poster?: string };
export async function selectPlayback(scene: ScriptScene, text: string, jobs: VideoJob[], avatar: AvatarIdentity | null): Promise<PlaybackSource> {
  // 配置查询失败时保守使用当前文案 TTS，不能猜测形象并播放旧视频。
  if (!avatar) return { kind: "tts", label: "浏览器语音合成" };
  const seed = createSeedStore().scripts.find(s => s.scene === scene);
  if (seed?.content === text && avatar.personId === PRESET_AVATAR.personId && avatar.audioManId === PRESET_AVATAR.audioManId)
    return { kind: "preset", label: "蝉镜数字人 · 预生成", url: `/videos/${scene}.mp4`, poster: `/videos/${scene}.jpg` };
  const hash = await videoHash(scene, text, avatar);
  const job = jobs.find(j => j.hash === hash && j.scene === scene && j.text === text && j.status === "completed" && j.url === `/generated/${hash}.mp4`);
  if (job) return { kind: "generated", label: "蝉镜数字人 · 实时生成", url: job.url, poster: job.poster === `/generated/${hash}.jpg` ? job.poster : undefined };
  return { kind: "tts", label: "浏览器语音合成" };
}
