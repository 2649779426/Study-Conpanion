import "server-only";
import { execFile } from "node:child_process";
import { rename, stat } from "node:fs/promises";

/** 封面是可选增强：ffmpeg 缺失、超时或抽帧失败不影响已经下载的视频。 */
export async function createVideoPoster(videoPath: string, posterPath: string): Promise<boolean> {
  try {
    const temporary = `${posterPath}.tmp.jpg`;
    await new Promise<void>((resolve, reject) => {
      execFile("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-ss", "0.5", "-i", videoPath,
        "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "2", temporary],
      { timeout: 15000, windowsHide: true }, error => error ? reject(error) : resolve());
    });
    if (!(await stat(temporary)).size) return false;
    await rename(temporary, posterPath);
    return true;
  } catch { return false; }
}
