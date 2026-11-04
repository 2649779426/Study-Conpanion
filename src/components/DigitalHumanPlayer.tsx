"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/DemoToast";
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
  const { show } = useToast();

  const current = useMemo(() => {
    return (
      scripts.find((s) => s.scene === scene) ?? {
        id: "fallback",
        scene,
        title: sceneLabel[scene],
        content: "今天也要稳步推进，打卡见。",
        updatedAt: "",
      }
    );
  }, [scripts, scene]);

  const text = useMemo(
    () => current.content.replace(/同学/g, userName || "同学"),
    [current.content, userName],
  );

  useEffect(() => () => stopSpeaking(), []);

  function play() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      show("当前浏览器不支持语音播报，已展示文案演示");
      setSpoken(text);
      return;
    }
    stopSpeaking();
    setSpoken(text);
    setPlaying(true);
    show(`正在播报：${sceneLabel[scene]}`);
    speakText(text, () => setPlaying(false));
  }

  function stop() {
    stopSpeaking();
    setPlaying(false);
    show("已停止播报");
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2>数字人播报</h2>
        <span className="linkish">Lama Dev 风格 · Demo TTS</span>
      </div>

      <div className="dh-box">
        <div className="dh-avatar">
          <div className="dh-face" aria-hidden>
            <span className="eye l" />
            <span className="eye r" />
            <span className={`mouth ${playing ? "talk" : ""}`} />
          </div>
        </div>

        <div className="chips">
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

        <div className="script-box">{spoken || text}</div>

        <div className="row">
          {!playing ? (
            <button type="button" className="btn sky" onClick={play}>
              开始播报
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={stop}>
              停止
            </button>
          )}
          <span className="muted" style={{ fontSize: 12 }}>
            比赛 Demo 用浏览器语音；可替换万相预生成视频
          </span>
        </div>
      </div>
    </section>
  );
}
