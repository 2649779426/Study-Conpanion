"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "./StoreProvider";
import { finalText, videoHash } from "@/lib/playback";
import type { ScriptItem, VideoJob } from "@/lib/types";

const states: Record<VideoJob["status"], string> = {
  queued: "排队中", audio: "合成语音", video: "合成视频", completed: "完成", failed: "失败",
};
export function VideoGeneration({ script }: { script: ScriptItem }) {
  const { store, startGeneration, generationError, avatar, configured, configError } = useAppStore();
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const text = finalText(script.content, store?.userName || "同学");
  useEffect(() => {
    let cancelled = false;
    if (!avatar) return;
    void videoHash(script.scene, text, avatar).then(value => { if (!cancelled) setHash(value); });
    return () => { cancelled = true; };
  }, [script.scene, text, avatar]);
  const job = store?.videoJobs.find(j => j.hash === hash && j.text === text && j.scene === script.scene);
  const active = job && !["completed", "failed"].includes(job.status);
  return <div className="generation-box">
    <b>{script.title}</b>
    <p className="muted">最终播报称呼：{store?.userName}。按已保存文案生成；修改后请先保存。</p>
    <button type="button" className="btn sky" disabled={!configured || busy || !!active || !text.trim()}
      onClick={async () => { setBusy(true); try { await startGeneration(script.scene, text); } catch { /* 原因在全局状态显示 */ } finally { setBusy(false); } }}>
      {busy ? "正在创建任务…" : active ? "生成进行中…" : "生成数字人视频"}
    </button>
    <p role="status" className="muted">{configured === false ? "未配置蝉镜凭据，见 README" : configured === null ? configError || "正在检查凭据配置…" : "使用蝉镜开放平台，可能产生平台费用"}</p>
    {job ? <p role="status">{states[job.status]}{job.detail ? ` · ${job.detail}` : ""}{job.error ? `：${job.error}` : ""}</p> : null}
    {generationError ? <p role="alert">{generationError}</p> : null}
    {job?.status === "completed" && job.url ? <a className="linkish" href={job.url} target="_blank" rel="noreferrer">打开本地生成视频 ↗</a> : null}
  </div>;
}
