"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/DemoToast";
import type { ScriptItem, ScriptScene } from "@/lib/types";
import { speakText, stopSpeaking } from "@/lib/tts";

const sceneLabel: Record<ScriptScene, string> = {
  opening: "开场陪伴",
  reminder: "节点提醒",
  review: "复盘总结",
};

const sceneVideo: Record<ScriptScene, string> = {
  opening: "/videos/opening.mp4",
  reminder: "/videos/reminder.mp4",
  review: "/videos/review.mp4",
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
  const [videoSrc, setVideoSrc] = useState<string | null>(
    sceneVideo[defaultScene],
  );
  const [generating, setGenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
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

  useEffect(() => {
    setVideoSrc(`${sceneVideo[scene]}?v=${Date.now()}`);
  }, [scene]);

  async function play() {
    stopSpeaking();
    setSpoken(text);
    if (videoSrc && videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
        setPlaying(true);
        show(`正在播放数字人视频：${sceneLabel[scene]}`);
        return;
      } catch {
        // fall through to TTS
      }
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      show("当前环境无法播放视频/语音，已展示文案");
      return;
    }
    setPlaying(true);
    show(`正在播报：${sceneLabel[scene]}`);
    speakText(text, () => setPlaying(false));
  }

  function stop() {
    stopSpeaking();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setPlaying(false);
    show("已停止播报");
  }

  async function generateViaChanJing() {
    setGenerating(true);
    show("正在调用蝉镜生成数字人视频…");
    try {
      const res = await fetch("/api/chanjing/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.video_url) {
        throw new Error(data.error || "生成失败");
      }
      setVideoSrc(data.video_url);
      show("蝉镜视频已生成（临时链接，请尽快转存）");
    } catch (error) {
      show(error instanceof Error ? error.message : "蝉镜生成失败");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2>数字人播报</h2>
        <span className="linkish">蝉镜接入 · TTS→视频</span>
      </div>

      <div className="dh-box">
        <div className="dh-avatar">
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              controls={false}
              poster=""
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <div className="dh-face" aria-hidden>
              <span className="eye l" />
              <span className="eye r" />
              <span className={`mouth ${playing ? "talk" : ""}`} />
            </div>
          )}
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
          <button
            type="button"
            className="btn purple"
            disabled={generating}
            onClick={generateViaChanJing}
          >
            {generating ? "生成中…" : "蝉镜实时生成"}
          </button>
        </div>
      </div>
    </section>
  );
}
