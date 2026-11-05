"use client";
import { createSeedStore, LEGACY_SCRIPT_TEXTS, STORAGE_KEY } from "./seed";
import { todayKey, shiftDay, beijingTime } from "./date";
import { pauseFocus, settleFocus, syncTaskFocus } from "./focus";
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
  store = { ...seed, ...store, focus: store.focus ?? null,
    focusRecords: store.focusRecords ?? [], focusRemainders: store.focusRemainders ?? {} };
  if (store.focus && todayKey(new Date(store.focus.startedAt)) < today) {
    store = settleFocus(store, new Date(`${today}T00:00:00+08:00`).getTime(), true);
  }
  const template = store.templates.find(t => t.id === store.plan?.templateId);
  const changedDay = store.taskDate !== today;
  const seen = new Set<string>();
  const checkIns = store.checkIns.filter(r => {
    if (seen.has(r.date)) return false;
    seen.add(r.date); return true;
  }).map(r => ({ ...r, allDone: r.allDone ?? false, totalTasks: r.totalTasks ?? 0 }));
  return syncTaskFocus({
    ...seed, ...store, checkIns, taskDate: today,
    scripts: store.scripts.map(script => script.content === LEGACY_SCRIPT_TEXTS[script.scene]
      ? { ...script, content: seed.scripts.find(s => s.scene === script.scene)!.content }
      : script),
    // 自动提醒过窗后即使曾排队、刷新或跨天也不能补播；旧版无窗口的自动队列丢弃。
    broadcasts: store.broadcasts.filter(b => b.expiresAt ? b.expiresAt > Date.now() : !b.id.startsWith("rule-")),
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
  }, today);
}
export function applyTemplate(store: AppStore, template: PlanTemplate, userName?: string): AppStore {
  store = pauseFocus(normalizeStore(store));
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
  store = pauseFocus(normalizeStore(store));
  if (!store.plan || !store.plan.tasks.length) return store;
  const today = todayKey();
  const taskIds = store.plan.tasks.filter(t => t.done).map(t => t.id);
  const subjectSeconds: Record<string, number> = {};
  for (const r of store.focusRecords.filter(r => r.date === today)) {
    subjectSeconds[r.subject] = (subjectSeconds[r.subject] ?? 0) + r.seconds;
  }
  const subjectPlannedMinutes: Record<string, number> = {};
  for (const t of store.plan.tasks) subjectPlannedMinutes[t.subject] = (subjectPlannedMinutes[t.subject] ?? 0) + t.minutes;
  const record: CheckInRecord = {
    id: `check-${today}`, date: today, taskIds, totalTasks: store.plan.tasks.length,
    allDone: store.plan.tasks.every(t => t.done), note, createdAt: new Date().toISOString(),
    subjectSeconds, subjectPlannedMinutes,
    plannedMinutes: store.plan.tasks.reduce((n, t) => n + t.minutes, 0),
    tasks: store.plan.tasks.map(t => ({ ...t })),
    adjustments: store.checkIns.find(r => r.date === today)?.adjustments ?? [],
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
  const adjustments: NonNullable<CheckInRecord["adjustments"]> = [];
  const tasks = store.plan.tasks.map(t => {
    if (t.done) return t;
    const mode = ratio >= .75 ? "加练" : ratio > 0 && ratio < .4 ? "精简" : "";
    const minutes = mode === "加练" ? t.baseMinutes + 10 : mode === "精简" ? Math.max(15, t.baseMinutes - 10) : t.baseMinutes;
    if (mode) adjustments.push({ taskId: t.id, title: t.baseTitle, mode, before: t.baseMinutes, after: minutes });
    return { ...t, title: t.baseTitle + (mode ? `（${mode}）` : ""),
      minutes };
  });
  return { ...store, plan: { ...store.plan, tasks }, checkIns: store.checkIns.map(r => r.date === todayKey()
    ? { ...r, adjustments: [...(r.adjustments ?? []).filter(old => !adjustments.some(a => a.taskId === old.taskId)), ...adjustments] } : r) };
}
export function shouldTriggerRule(store: AppStore, rule: ReminderRule, now = new Date()): boolean {
  const elapsed = ruleElapsed(rule, now);
  return rule.enabled && elapsed >= 0 && elapsed < 10
    && store.triggeredRules[rule.id] !== todayKey(now) && store.missedRules?.[rule.id] !== todayKey(now)
    && (rule.scene !== "reminder" || !!store.plan?.tasks.some(t => !t.done));
}
function ruleElapsed(rule: ReminderRule, now: Date): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time)) return NaN;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return minutes(beijingTime(now)) - minutes(rule.time);
}
export function triggerRule(store: AppStore, rule: ReminderRule, manual = false): AppStore {
  store = normalizeStore(store);
  const now = new Date();
  const today = todayKey(now);
  const id = manual ? `manual-${crypto.randomUUID()}` : `rule-${rule.id}-${today}`;
  if (!manual) {
    if (!rule.enabled || store.triggeredRules[rule.id] === today || store.missedRules[rule.id] === today) return store;
    if (ruleElapsed(rule, now) >= 10) return addMessage({
      ...store, missedRules: { ...store.missedRules, [rule.id]: today },
    }, `missed-${rule.id}-${today}`, `${rule.time} ${rule.name} · 已错过`);
    if (!shouldTriggerRule(store, rule, now)) return store;
  }
  const expiresAt = manual ? undefined : new Date(`${today}T${rule.time}:00+08:00`).getTime() + 10 * 60000;
  return addMessage({
    ...store,
    triggeredRules: manual ? store.triggeredRules : { ...store.triggeredRules, [rule.id]: today },
    broadcasts: [...store.broadcasts, { id, scene: rule.scene, title: `${manual ? "手动试触发" : "到点提醒"} · ${rule.name}`, expiresAt }],
  }, id, `${manual ? "手动试触发" : "北京时间到点提醒"}：${rule.name}（${rule.time}）`);
}
export function noticeKey(rule: ReminderRule): string { return JSON.stringify(rule); }
export function updateVideoJob(store: AppStore, job: VideoJob): AppStore {
  const previous = store.videoJobs.find(j => j.jobId === job.jobId);
  const next = { ...store, videoJobs: [job, ...store.videoJobs.filter(j => j.jobId !== job.jobId)] };
  return job.status === "completed" && job.url && previous?.status !== "completed"
    ? addMessage(next, `video-${job.jobId}`, "数字人视频已生成并保存到本地，可播放匹配文案。") : next;
}
