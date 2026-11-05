"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { adjustPlanByProgress, applyTemplate, loadStore, saveStore, submitCheckIn, toggleTask, upsertRule, upsertScript, normalizeStore, triggerRule, noticeKey, updateVideoJob } from "@/lib/store";
import { createSeedStore } from "@/lib/seed";
import type { AppStore, PlanTemplate, ReminderRule, ScriptItem, ScriptScene, VideoJob } from "@/lib/types";

type StoreApi = {
  store: AppStore | null; ready: boolean;
  setUserName: (name: string) => void;
  chooseTemplate: (template: PlanTemplate, userName?: string) => void;
  toggleTask: (id: string) => void; checkIn: (note: string) => void;
  saveScript: (script: ScriptItem) => void; saveRule: (rule: ReminderRule) => void;
  tryRule: (rule: ReminderRule) => void; dismissBroadcast: () => void;
  markRead: (panel: "message" | "notice") => void; resetDemo: () => void;
  startGeneration: (scene: ScriptScene, text: string) => Promise<void>;
  rememberJob: (job: VideoJob) => void;
  generationError: string;
};
const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AppStore | null>(null);
  const [generationError, setGenerationError] = useState("");
  const current = useRef<AppStore | null>(null);
  const mutate = useCallback((change: (store: AppStore) => AppStore) => {
    if (!current.current) return;
    const next = change(current.current);
    current.current = next; saveStore(next); setStore(next);
  }, []);
  const rememberJob = useCallback((job: VideoJob) => mutate(s => updateVideoJob(s, job)), [mutate]);
  useEffect(() => {
    const tick = () => mutate(s => {
      let next = normalizeStore(s);
      for (const rule of next.rules) next = triggerRule(next, rule);
      return next;
    });
    const init = window.setTimeout(() => {
      const initial = loadStore();
      current.current = initial; setStore(initial); tick();
    }, 0);
    const timer = window.setInterval(tick, 20000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(init); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [mutate]);
  useEffect(() => {
    let disposed = false;
    let busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const jobs = current.current?.videoJobs.filter(j => !["completed", "failed"].includes(j.status)) ?? [];
        for (const job of jobs) {
          try {
            const response = await fetch(`/api/chanjing/broadcast?id=${job.jobId}`, { cache: "no-store", signal: AbortSignal.timeout(180000) });
            const body = await response.json();
            if (!response.ok || !body.ok) throw new Error(body.error || "查询生成进度失败");
            if (!disposed) { mutate(s => updateVideoJob(s, body.job)); setGenerationError(""); }
          } catch (error) {
            if (!disposed) setGenerationError(`进度查询暂不可用，将继续重试：${error instanceof Error ? error.message : "网络异常"}`);
          }
        }
      } finally { busy = false; }
    };
    const timer = window.setInterval(() => { void poll(); }, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [mutate]);
  const api = useMemo<StoreApi>(() => ({
    store, ready: !!store, generationError,
    setUserName: name => mutate(s => ({ ...s, userName: name.trim() || "同学" })),
    chooseTemplate: (template, name) => mutate(s => applyTemplate(s, template, name)),
    toggleTask: id => mutate(s => toggleTask(s, id)),
    checkIn: note => mutate(s => adjustPlanByProgress(submitCheckIn(s, note))),
    saveScript: script => mutate(s => upsertScript(s, script)),
    saveRule: rule => mutate(s => upsertRule(s, rule)),
    tryRule: rule => mutate(s => triggerRule(s, rule, true)),
    dismissBroadcast: () => mutate(s => ({ ...s, broadcasts: s.broadcasts.slice(1) })),
    markRead: panel => mutate(s => panel === "message"
      ? { ...s, messages: s.messages.map(m => ({ ...m, read: true })) }
      : { ...s, noticeReadKeys: s.rules.filter(r => r.enabled).map(noticeKey) }),
    resetDemo: () => { setGenerationError(""); mutate(() => createSeedStore()); },
    rememberJob,
    async startGeneration(scene, text) {
      setGenerationError("");
      try {
        const response = await fetch("/api/chanjing/broadcast", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scene, text }),
        });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || "创建任务失败");
        mutate(s => updateVideoJob(s, body.job));
      } catch (error) {
        setGenerationError(error instanceof Error ? error.message : "生成请求失败");
        throw error;
      }
    },
  }), [store, mutate, generationError, rememberJob]);
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}
export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useAppStore must be used within StoreProvider");
  return context;
}
