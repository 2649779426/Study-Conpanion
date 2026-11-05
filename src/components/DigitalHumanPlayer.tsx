"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptItem, ScriptScene } from "@/lib/types";
import { speakText, stopSpeaking } from "@/lib/tts";
import { finalText, selectPlayback, type PlaybackSource } from "@/lib/playback";
import { useAppStore } from "./StoreProvider";

const labels: Record<ScriptScene, string> = { opening: "开场陪伴", reminder: "节点提醒", review: "复盘总结" };
let activePlayer: symbol | null = null;
type Props = {
  scripts: ScriptItem[]; userName: string; defaultScene?: ScriptScene; autoPlay?: boolean;
  playSignal?: { scene: ScriptScene; token: number } | null; companion?: boolean;
};
export function DigitalHumanPlayer({ scripts, userName, defaultScene = "opening", autoPlay = false, playSignal, companion = true }: Props) {
  const { store, rememberJob } = useAppStore();
  const [scene, setScene] = useState(defaultScene);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<PlaybackSource>({ kind: "tts", label: "浏览器语音合成" });
  const [status, setStatus] = useState("点击播放，听取当前文案");
  const [requested, setRequested] = useState(0);
  const [ready, setReady] = useState(false);
  const [resolvedFor, setResolvedFor] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const identity = useRef("");
  const lastPlayed = useRef(0);
  const owner = useRef(Symbol("digital-human"));
  const jobs = store?.videoJobs;
  const text = finalText(scripts.find(s => s.scene === scene)?.content ?? "", userName);
  const stop = useCallback(() => {
    if (activePlayer === owner.current) { stopSpeaking(); activePlayer = null; }
    video.current?.pause(); setPlaying(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void selectPlayback(scene, text, jobs ?? []).then(result => {
      if (cancelled) return;
      const nextIdentity = JSON.stringify([scene, text, result.url]);
      if (identity.current !== nextIdentity) {
        video.current?.pause();
        if (activePlayer === owner.current) { stopSpeaking(); activePlayer = null; }
        setPlaying(false);
        identity.current = nextIdentity; setSource(result);
      }
      setReady(true);
      setResolvedFor(JSON.stringify([scene, text]));
    }).catch(() => { if (!cancelled) { setReady(true); setSource({ kind: "tts", label: "浏览器语音合成" }); } });
    return () => { cancelled = true; };
  }, [scene, text, jobs]);

  // 本地存储被重置或换浏览器后，按最终文本查询服务端已存在的视频；不创建付费任务。
  useEffect(() => {
    let cancelled = false;
    if (!text) return;
    void fetch(`/api/chanjing/broadcast?${new URLSearchParams({ scene, text })}`, { cache: "no-store" })
      .then(r => r.json()).then(body => { if (!cancelled && body.ok && body.job) rememberJob(body.job); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [scene, text, rememberJob]);

  const speak = useCallback(() => {
    setSource({ kind: "tts", label: "浏览器语音合成" });
    if (!window.speechSynthesis) { setPlaying(false); setStatus("当前浏览器不支持语音合成，可阅读下方完整文案"); return; }
    setPlaying(true); setStatus("正在朗读当前文案");
    speakText(text, () => { setPlaying(false); setStatus("语音播报已结束"); }, reason => {
      setPlaying(false); setStatus(`语音未能播放（${reason}），请点击重播或检查浏览器语音支持`);
    });
  }, [text]);

  useEffect(() => {
    const playerId = owner.current;
    const onOtherPlay = (event: Event) => {
      if ((event as CustomEvent).detail !== owner.current) stop();
    };
    window.addEventListener("digital-human-play", onOtherPlay);
    return () => {
      window.removeEventListener("digital-human-play", onOtherPlay);
      if (activePlayer === playerId) { stopSpeaking(); activePlayer = null; }
    };
  }, [stop]);
  useEffect(() => {
    const element = video.current;
    return () => element?.pause();
  }, [source.url]);

  useEffect(() => {
    if (!ready || resolvedFor !== JSON.stringify([scene, text]) || !requested || requested === lastPlayed.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      lastPlayed.current = requested;
      window.dispatchEvent(new CustomEvent("digital-human-play", { detail: owner.current }));
      activePlayer = owner.current;
      stopSpeaking();
      if (!text.trim()) { setStatus("当前场景没有有效文案，请先配置"); return; }
      if (!source.url) { speak(); return; }
      const element = video.current;
      if (!element) return;
      element.currentTime = 0; element.muted = false;
      void element.play().then(() => {
        if (cancelled) { element.pause(); return; }
        setPlaying(true); setStatus("正在播放与当前文案匹配的数字人视频");
      }).catch(error => {
        if (cancelled) return;
        setPlaying(false);
        if (error instanceof Error && error.name === "NotAllowedError") setStatus("浏览器限制自动出声，请点击播放");
        else { setStatus("视频不可用，改用当前文案语音"); speak(); }
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [requested, ready, resolvedFor, scene, source, text, speak]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setTimeout(() => setRequested(n => n + 1), 600);
    return () => clearTimeout(timer);
  }, [autoPlay]);
  useEffect(() => {
    if (!playSignal) return;
    const timer = window.setTimeout(() => { setScene(playSignal.scene); setRequested(n => n + 1); }, 0);
    return () => clearTimeout(timer);
  }, [playSignal]);

  return <section className={`card dh-card ${playing ? "dh-live" : ""}`}>
    <div className="section-head"><h2>督学陪伴</h2><span className={`dh-status ${playing ? "on" : ""}`}>{playing ? "正在播报" : "等待播放"}</span></div>
    <div className="dh-box">
      <div className="dh-avatar">
        {source.url ? <video ref={video} src={source.url} playsInline preload="metadata"
          onEnded={() => { setPlaying(false); setStatus("播报结束，继续按计划推进"); }}
          onError={() => { setStatus("视频文件不可用，改用当前文案语音"); setSource({ kind: "tts", label: "浏览器语音合成" }); setPlaying(false); setRequested(n => n + 1); }}
        /> : <div className="dh-static"><Image src="/avatar.png" alt="督学助手静态形象" width={96} height={96} /><span>督学助手 · 语音陪伴</span></div>}
        {!playing ? <div className="dh-pulse" aria-hidden /> : null}
      </div>
      <span className="pill">{ready ? source.label : "正在匹配播报来源"}</span>
      {source.kind === "tts" && ready ? <p className="dh-hint">文案已更新，视频待生成</p> : null}
      <p className="dh-presence" role="status">{status}</p>
      <div className="script-box">{text || "请在后台配置播报文案"}</div>
      {!companion ? <div className="chips">{(Object.keys(labels) as ScriptScene[]).map(key =>
        <button key={key} type="button" className={scene === key ? "chip active" : "chip"}
          onClick={() => { stop(); setScene(key); setRequested(n => n + 1); }}>{labels[key]}</button>)}</div> : null}
      <div className="row">{playing ? <button type="button" className="btn ghost" onClick={() => { stop(); setStatus("播放已暂停"); }}>先安静一下</button>
        : <button type="button" className="btn sky" disabled={!ready || !text.trim()} onClick={() => setRequested(n => n + 1)}>播放 / 重播</button>}</div>
    </div>
  </section>;
}
