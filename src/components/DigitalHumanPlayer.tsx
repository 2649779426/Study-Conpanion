"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScriptItem, ScriptScene } from "@/lib/types";
import { speakText, stopSpeaking } from "@/lib/tts";

const sceneLabel: Record<ScriptScene, string> = {
  opening: "开场陪伴",
  reminder: "节点提醒",
  review: "复盘总结",
};

type Props = {
  scripts: ScriptItem[];
  userName: string;
  defaultScene?: ScriptScene;
};

export function DigitalHumanPlayer({
  scripts,
  userName,
  defaultScene = "opening",
}: Props) {
  const [scene, setScene] = useState<ScriptScene>(defaultScene);
  const [playing, setPlaying] = useState(false);
  const [spoken, setSpoken] = useState("");

  const current = useMemo(() => {
    return (
      scripts.find((s) => s.scene === scene) ??
      scripts[0] ?? {
        id: "fallback",
        scene,
        title: sceneLabel[scene],
        content: "今天也要稳步推进，打卡见。",
        updatedAt: "",
      }
    );
  }, [scripts, scene]);

  const text = useMemo(() => {
    return current.content.replace(/同学/g, userName || "同学");
  }, [current.content, userName]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  function play() {
    stopSpeaking();
    setSpoken(text);
    setPlaying(true);
    speakText(text, () => setPlaying(false));
  }

  function stop() {
    stopSpeaking();
    setPlaying(false);
  }

  return (
    <section className="dh-card">
      <div className={`dh-stage ${playing ? "speaking" : ""}`}>
        <div className="dh-avatar" aria-hidden>
          <div className="dh-face">
            <span className="eye left" />
            <span className="eye right" />
            <span className={`mouth ${playing ? "talk" : ""}`} />
          </div>
          <p>督学数字人 · 雅知</p>
        </div>
        <div className="dh-panel">
          <div className="scene-tabs">
            {(Object.keys(sceneLabel) as ScriptScene[]).map((key) => (
              <button
                key={key}
                type="button"
                className={scene === key ? "chip active" : "chip"}
                onClick={() => {
                  stop();
                  setScene(key);
                }}
              >
                {sceneLabel[key]}
              </button>
            ))}
          </div>
          <h2>{current.title}</h2>
          <p className="script-body">{spoken || text}</p>
          <div className="dh-actions">
            {!playing ? (
              <button type="button" className="btn primary" onClick={play}>
                开始播报
              </button>
            ) : (
              <button type="button" className="btn" onClick={stop}>
                停止
              </button>
            )}
            <span className="hint">比赛 Demo：浏览器 TTS 模拟数字人播报</span>
          </div>
        </div>
      </div>
    </section>
  );
}
