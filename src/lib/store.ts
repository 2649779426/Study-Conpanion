"use client";
import { createSeedStore, STORAGE_KEY } from "./seed";
import { todayKey, shiftDay, beijingTime } from "./date";
import type { AppStore, CheckInRecord, PlanTemplate, ReminderRule, ScriptItem, VideoJob } from "./types";

export function loadStore(): AppStore {
  if (typeof window === "undefined") return createSeedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : createSeedStore();
    return normalizeStore({ ...createSeedStore(), ...parsed,
      taskDate: parsed.taskDate ?? parsed.checkIns?.[0]?.date ?? parsed.plan?.startDate ?? todayKey(),
    });
  } catch { return createSeedStore(); }
}
export function saveStore(store: AppStore) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
/** 截至今天（今天未全部完成则从昨天起），连续的“当天全部完成”记录才计一天。
 * 缺失或部分完成的一天中断连续；旧版无完成快照的记录不推测为全完成。 */
export function calculateStreak(records: CheckInRecord[], today = todayKey()): number {
  const complete = new Set(records.filter(r => r.allDone && r.totalTasks > 0).map(r => r.date));
  let cursor = complete.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (complete.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  return streak;
}
export function normalizeStore(store: AppStore, today = todayKey()): AppStore {
  const seed = createSeedStore();
  const template = store.templates.find(t => t.id === store.plan?.templateId);
  const changedDay = store.taskDate !== today;
  const seen = new Set<string>();
  const checkIns = store.checkIns.filter(r => {
    if (seen.has(r.date)) return false;
    seen.add(r.date); return true;
  }).map(r => ({ ...r, allDone: r.allDone ?? false, totalTasks: r.totalTasks ?? 0 }));
  return {
    ...seed, ...store, checkIns, taskDate: today,
    plan: store.plan ? {
      ...store.plan, streak: calculateStreak(checkIns, today),
      tasks: store.plan.tasks.map(t => {
        const baseTitle = t.baseTitle ?? t.title.replace(/（加练）|（精简）/g, "");
        const original = seed.plan?.tasks.find(s => s.id === t.id);
        const templateMinutes = template?.tasks.length ? Math.max(20, Math.round(template.dailyMinutes / template.tasks.length)) : undefined;
        const baseMinutes = t.baseMinutes ?? original?.baseMinutes ?? templateMinutes ?? t.minutes;
        return { ...t, baseTitle, baseMinutes, done: changedDay ? false : t.done };
      }),
    } : null,
  };
}
export function applyTemplate(store: AppStore, template: PlanTemplate, userName?: string): AppStore {
  store = normalizeStore(store);
  return {
    ...store, userName: userName?.trim() || store.userName,
    plan: {
      id: `plan-${Date.now()}`, templateId: template.id, name: template.name,
      examTarget: template.examTarget, startDate: todayKey(), streak: calculateStreak(store.checkIns),
      tasks: template.tasks.map((title, index) => {
        const minutes = Math.max(20, Math.round(template.dailyMinutes / template.tasks.length));
        return { id: `task-${Date.now()}-${index}`, title, baseTitle: title, minutes,
          baseMinutes: minutes, subject: template.subjects[index % template.subjects.length] ?? "综合", done: false };
      }),
    },
  };
}
export function toggleTask(store: AppStore, taskId: string): AppStore {
  store = normalizeStore(store);
  if (!store.plan) return store;
  return { ...store, plan: { ...store.plan, tasks: store.plan.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) } };
}
export function addMessage(store: AppStore, id: string, text: string): AppStore {
  return { ...store, messages: [
    { id, text, read: false, createdAt: new Date().toISOString() },
    ...store.messages.filter(m => m.id !== id),
  ] };
}
export function submitCheckIn(store: AppStore, note: string): AppStore {
  store = normalizeStore(store);
  if (!store.plan || !store.plan.tasks.length) return store;
  const today = todayKey();
  const taskIds = store.plan.tasks.filter(t => t.done).map(t => t.id);
  const record: CheckInRecord = {
    id: `check-${today}`, date: today, taskIds, totalTasks: store.plan.tasks.length,
    allDone: store.plan.tasks.every(t => t.done), note, createdAt: new Date().toISOString(),
  };
  const checkIns = [record, ...store.checkIns.filter(r => r.date !== today)].sort((a, b) => b.date.localeCompare(a.date));
  return addMessage({ ...store, checkIns, plan: { ...store.plan, streak: calculateStreak(checkIns) } },
    record.id, `${today} 打卡：完成 ${taskIds.length}/${record.totalTasks} 项。 ${note}`);
}
export function upsertScript(store: AppStore, script: ScriptItem): AppStore {
  const old = store.scripts.find(s => s.id === script.id);
  if (old && old.scene !== script.scene) return store;
  if (store.scripts.some(s => s.id !== script.id && s.scene === script.scene)) return store;
  return { ...store, scripts: old ? store.scripts.map(s => s.id === script.id ? script : s) : [...store.scripts, script] };
}
export function upsertRule(store: AppStore, rule: ReminderRule): AppStore {
  return { ...store, rules: store.rules.some(r => r.id === rule.id)
    ? store.rules.map(r => r.id === rule.id ? rule : r) : [...store.rules, rule] };
}
export function adjustPlanByProgress(store: AppStore): AppStore {
  store = normalizeStore(store);
  if (!store.plan) return store;
  const ratio = store.plan.tasks.filter(t => t.done).length / (store.plan.tasks.length || 1);
  return { ...store, plan: { ...store.plan, tasks: store.plan.tasks.map(t => {
    if (t.done) return t;
    const mode = ratio >= .75 ? "加练" : ratio > 0 && ratio < .4 ? "精简" : "";
    return { ...t, title: t.baseTitle + (mode ? `（${mode}）` : ""),
      minutes: mode === "加练" ? t.baseMinutes + 10 : mode === "精简" ? Math.max(15, t.baseMinutes - 10) : t.baseMinutes };
  }) } };
}
export function shouldTriggerRule(store: AppStore, rule: ReminderRule, now = new Date()): boolean {
  return rule.enabled && /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time)
    && beijingTime(now) >= rule.time && store.triggeredRules[rule.id] !== todayKey(now)
    && (rule.scene !== "reminder" || !!store.plan?.tasks.some(t => !t.done));
}
export function triggerRule(store: AppStore, rule: ReminderRule, manual = false): AppStore {
  store = normalizeStore(store);
  const id = manual ? `manual-${crypto.randomUUID()}` : `rule-${rule.id}-${todayKey()}`;
  if (!manual && !shouldTriggerRule(store, rule)) return store;
  return addMessage({
    ...store,
    triggeredRules: manual ? store.triggeredRules : { ...store.triggeredRules, [rule.id]: todayKey() },
    broadcasts: [...store.broadcasts, { id, scene: rule.scene, title: `${manual ? "手动试触发" : "到点提醒"} · ${rule.name}` }],
  }, id, `${manual ? "手动试触发" : "北京时间到点提醒"}：${rule.name}（${rule.time}）`);
}
export function noticeKey(rule: ReminderRule): string { return JSON.stringify(rule); }
export function updateVideoJob(store: AppStore, job: VideoJob): AppStore {
  const previous = store.videoJobs.find(j => j.jobId === job.jobId);
  const next = { ...store, videoJobs: [job, ...store.videoJobs.filter(j => j.jobId !== job.jobId)] };
  return job.status === "completed" && job.url && previous?.status !== "completed"
    ? addMessage(next, `video-${job.jobId}`, "数字人视频已生成并保存到本地，可播放匹配文案。") : next;
}
