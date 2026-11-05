"use client";
import { useState } from "react";
import type { ScriptScene } from "@/lib/types";
import { useAppStore } from "./StoreProvider";
import { DigitalHumanPlayer } from "./DigitalHumanPlayer";
import { aggregateDays } from "@/lib/review";

/** 页面和紧凑卡片共用同一队列；切页保留当前事件，页内只挂载一个播放器。 */
export function ScheduledPlayer({ defaultScene = "opening", autoPlay = false, playSignal, compact = false }: {
  defaultScene?: ScriptScene; autoPlay?: boolean; compact?: boolean;
  playSignal?: { scene: ScriptScene; token: number } | null;
}) {
  const { store, dismissBroadcast } = useAppStore();
  const broadcast = store?.broadcasts[0];
  const [startOnMount] = useState(autoPlay && !broadcast);
  if (!store) return null;
  const record = store.checkIns.find(r => r.date === store.taskDate);
  const showSummary = !compact && (broadcast?.scene ?? playSignal?.scene ?? defaultScene) === "review" && !!record;
  return <div className="stack"><DigitalHumanPlayer scripts={store.scripts} userName={store.userName}
    defaultScene={defaultScene} autoPlay={startOnMount} compact={compact}
    playSignal={broadcast ? null : playSignal}
    reminder={broadcast ? { event: broadcast, remaining: store.broadcasts.length - 1, dismiss: dismissBroadcast } : undefined} />
    {showSummary ? <p className="card daily-review-summary">今天专注 {aggregateDays(store, 1)[0].minutes} 分钟，完成 {record.taskIds.length}/{record.totalTasks} 项</p> : null}
  </div>;
}
