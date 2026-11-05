"use client";
import { useState } from "react";
import type { ScriptScene } from "@/lib/types";
import { useAppStore } from "./StoreProvider";
import { DigitalHumanPlayer } from "./DigitalHumanPlayer";

/** 页面和紧凑卡片共用同一队列；切页保留当前事件，页内只挂载一个播放器。 */
export function ScheduledPlayer({ defaultScene = "opening", autoPlay = false, playSignal, compact = false }: {
  defaultScene?: ScriptScene; autoPlay?: boolean; compact?: boolean;
  playSignal?: { scene: ScriptScene; token: number } | null;
}) {
  const { store, dismissBroadcast } = useAppStore();
  const broadcast = store?.broadcasts[0];
  const [startOnMount] = useState(autoPlay && !broadcast);
  if (!store) return null;
  return <DigitalHumanPlayer scripts={store.scripts} userName={store.userName}
    defaultScene={defaultScene} autoPlay={startOnMount} compact={compact}
    playSignal={broadcast ? null : playSignal}
    reminder={broadcast ? { event: broadcast, remaining: store.broadcasts.length - 1, dismiss: dismissBroadcast } : undefined} />;
}
