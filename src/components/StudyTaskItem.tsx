"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "./StoreProvider";
import { taskFocusSeconds } from "@/lib/focus";
import type { StudyTask } from "@/lib/types";

export function StudyTaskItem({ task }: { task: StudyTask }) {
  const { store, toggleTask, startFocus, pauseFocus, endFocus } = useAppStore();
  const [now, setNow] = useState(() => Date.now());
  const active = store?.focus?.taskId === task.id;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  if (!store) return null;
  const seconds = taskFocusSeconds(store, task.id, active ? Math.max(now, store.focus!.startedAt) : Date.now());
  return <div className={`task-item focus-task ${task.done ? "done" : ""} ${active ? "is-focusing" : ""}`}>
    <button type="button" className="task-toggle" onClick={() => toggleTask(task.id)} aria-pressed={task.done}>
      <span><b>{task.title}</b><span className="muted task-time">{task.subject} · 计划 {task.minutes} 分钟 · 已专注 {Math.floor(seconds / 60)} 分钟</span></span>
      <span className={task.done ? "pill ok" : "pill warn"}>{task.done ? "已完成" : "点击完成"}</span>
    </button>
    <div className="row focus-controls">
      {active ? <>
        <span className="focus-clock" role="timer" aria-label={`${task.title}专注计时`}>专注中 {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
        <button type="button" className="btn ghost" onClick={pauseFocus}>暂停</button>
        <button type="button" className="btn" onClick={endFocus}>结束</button>
      </> : <button type="button" className="btn ghost" onClick={() => startFocus(task.id)}>{seconds ? "继续专注" : "开始专注"}</button>}
    </div>
  </div>;
}
