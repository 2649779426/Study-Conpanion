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

const scenePresence: Record<ScriptScene, string> = {
  opening: "我来陪你开始今天的学习",
  reminder: "我在旁边看着，提醒你跟上进度",
  review: "辛苦了，我陪你做个简短复盘",
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
  /** 进入页面后主动开场/播报 */
  autoPlay?: boolean;
  /** 有未完成任务时，空闲一段时间后主动提醒 */
  remindIfPending?: boolean;
  pendingCount?: number;
  /** 外部触发一次指定场景（如打卡后复盘），递增即可 */
  playSignal?: { scene: ScriptScene; token: number } | null;
  /** 陪伴模式：弱化手动控件 */
  companion?: boolean;
};

export function DigitalHumanPlayer({
  scripts,
  userName,
  defaultScene = "opening",
  autoPlay = false,
  remindIfPending = false,
  pendingCount = 0,
  playSignal = null,
  companion = true,
}: Props) {
  const [scene, setScene] = useState<ScriptScene>(defaultScene);
  const [playing, setPlaying] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [status, setStatus] = useState("督学助手在旁边陪着你");
  const [needsGesture, setNeedsGesture] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>(
    `${sceneVideo[defaultScene]}?v=1`,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(false);
  const mutedFallbackRef = useRef(false);
  const remindedRef = useRef(false);
  const lastSignalRef = useRef(0);
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

  async function playScene(next: ScriptScene, opts?: { soft?: boolean }) {
    stopSpeaking();
    setScene(next);
    const nextText =
      (scripts.find((s) => s.scene === next)?.content ?? text).replace(
        /同学/g,
        userName || "同学",
      );
    setSpoken(nextText);
    setStatus(scenePresence[next]);
    playingRef.current = true;
    setPlaying(true);

    const src = `${sceneVideo[next]}?v=${Date.now()}`;
    setVideoSrc(src);

    await new Promise((r) => setTimeout(r, 50));
    const el = videoRef.current;
    if (el) {
      if (el.src !== new URL(src, window.location.origin).href) {
        el.src = src;
      }
      if (el.readyState < 2) {
        await new Promise<void>((resolve) => {
          const done = () => {
            el.removeEventListener("canplay", done);
            resolve();
          };
          el.addEventListener("canplay", done);
          el.load();
          window.setTimeout(done, 2500);
        });
      }
      try {
        el.muted = mutedFallbackRef.current;
        el.currentTime = 0;
        await el.play();
        if (!opts?.soft) {
          show(
            mutedFallbackRef.current
              ? "督学助手已到（当前无声，轻触页面开启声音）"
              : scenePresence[next],
          );
        }
        return;
      } catch {
        // try muted autoplay — still feels present
        try {
          el.muted = true;
          mutedFallbackRef.current = true;
          setNeedsGesture(true);
          el.currentTime = 0;
          await el.play();
          setStatus("我已到场陪伴，轻触页面即可听到声音");
          return;
        } catch {
          // fall through to TTS
        }
      }
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      setPlaying(false);
      playingRef.current = false;
      setStatus("文案已准备好，我在旁边陪着你");
      return;
    }
    speakText(nextText, () => {
      setPlaying(false);
      playingRef.current = false;
      setStatus("我就在旁边，继续按计划推进就好");
    });
  }

  function stop() {
    stopSpeaking();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setPlaying(false);
    playingRef.current = false;
    setStatus("好的，我先安静陪着，有需要再叫我");
  }

  // Enter-page companionship
  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setTimeout(() => {
      void playScene(defaultScene, { soft: true });
    }, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, defaultScene]);

  // Idle reminder companionship
  useEffect(() => {
    if (!remindIfPending || pendingCount <= 0 || remindedRef.current) return;
    const timer = window.setTimeout(() => {
      if (playingRef.current || remindedRef.current) return;
      remindedRef.current = true;
      void playScene("reminder");
    }, 22000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remindIfPending, pendingCount]);

  // External signal (e.g. after check-in)
  useEffect(() => {
    if (!playSignal || playSignal.token === lastSignalRef.current) return;
    lastSignalRef.current = playSignal.token;
    void playScene(playSignal.scene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playSignal]);

  // Unlock sound on first gesture — feels natural for companionship
  useEffect(() => {
    const unlock = () => {
      if (!mutedFallbackRef.current) return;
      mutedFallbackRef.current = false;
      setNeedsGesture(false);
      const el = videoRef.current;
      if (el) {
        el.muted = false;
        if (el.paused && playingRef.current) {
          void el.play().catch(() => undefined);
        } else if (!playingRef.current) {
          void playScene(scene, { soft: true });
        }
      }
      setStatus(scenePresence[scene]);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <section className={`card dh-card ${playing ? "dh-live" : ""}`}>
      <div className="section-head">
        <h2>督学陪伴</h2>
        <span className={`dh-status ${playing ? "on" : ""}`}>
          {playing ? "正在陪伴" : "在线陪伴中"}
        </span>
      </div>

      <div className="dh-box">
        <div className="dh-avatar">
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            controls={false}
            onEnded={() => {
              setPlaying(false);
              playingRef.current = false;
              setStatus("我就在旁边，继续按计划推进就好");
            }}
          />
          {!playing ? <div className="dh-pulse" aria-hidden /> : null}
        </div>

        <p className="dh-presence">{status}</p>
        {needsGesture ? (
          <p className="dh-hint">浏览器限制了自动出声，轻触页面即可开启声音陪伴</p>
        ) : null}

        <div className="script-box">{spoken || text}</div>

        {!companion ? (
          <div className="chips">
            {(Object.keys(sceneLabel) as ScriptScene[]).map((key) => (
              <button
                key={key}
                type="button"
                className={scene === key ? "chip active" : "chip"}
                onClick={() => {
                  stop();
                  void playScene(key);
                }}
              >
                {sceneLabel[key]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="row">
          {playing ? (
            <button type="button" className="btn ghost" onClick={stop}>
              先安静一下
            </button>
          ) : (
            <button
              type="button"
              className="btn sky"
              onClick={() => void playScene(scene)}
            >
              再听一遍
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
