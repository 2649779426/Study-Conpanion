import { shiftDay, todayKey } from "./date";
import type { AppStore, FocusRecord } from "./types";

export function focusDurationText(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor(seconds / 60) % 60} 分`;
}

/** 按北京时间日界拆分；不足一秒的余量留在每个任务、每日的账上，暂停/结束也不丢。 */
function settlement(store: AppStore, now: number) {
  const records: FocusRecord[] = [];
  const remainders = { ...store.focusRemainders };
  const session = store.focus;
  if (!session) return { records, remainders };
  let cursor = session.startedAt;
  while (cursor < now) {
    const date = todayKey(new Date(cursor));
    const midnight = new Date(`${shiftDay(date, 1)}T00:00:00+08:00`).getTime();
    const end = Math.min(now, midnight);
    const key = `${date}:${session.taskId}`;
    const elapsed = end - cursor + (remainders[key] ?? 0);
    records.push({ id: `focus-${session.taskId}-${cursor}-${end}`, date,
      taskId: session.taskId, subject: session.subject, taskTitle: session.taskTitle,
      seconds: Math.floor(elapsed / 1000) });
    remainders[key] = elapsed % 1000;
    cursor = end;
  }
  return { records, remainders };
}

/** 运行中的时间只投影用于展示，不写记录；暂停、结束、切换或打卡才结算。 */
export function focusRecordsAt(store: AppStore, now = Date.now()): FocusRecord[] {
  return [...(store.focusRecords ?? []), ...settlement(store, now).records];
}
export function taskFocusSeconds(store: AppStore, taskId: string, now = Date.now()): number {
  const day = todayKey(new Date(now));
  return focusRecordsAt(store, now).filter(r => r.date === day && r.taskId === taskId)
    .reduce((n, r) => n + r.seconds, 0);
}
export function syncTaskFocus(store: AppStore, day = todayKey()): AppStore {
  const seconds = new Map<string, number>();
  for (const r of store.focusRecords ?? []) if (r.date === day) seconds.set(r.taskId, (seconds.get(r.taskId) ?? 0) + r.seconds);
  return { ...store, plan: store.plan ? { ...store.plan, tasks: store.plan.tasks.map(t => ({ ...t,
    actualSeconds: seconds.get(t.id) ?? 0, actualMinutes: Math.floor((seconds.get(t.id) ?? 0) / 60),
  })) } : null };
}
export function settleFocus(store: AppStore, now = Date.now(), keepRunning = false): AppStore {
  if (!store.focus) return store;
  const { records, remainders } = settlement(store, now);
  return syncTaskFocus({ ...store, focusRecords: [...(store.focusRecords ?? []), ...records],
    focusRemainders: remainders,
    focus: keepRunning ? { ...store.focus, startedAt: Math.max(store.focus.startedAt, now) } : null,
  }, todayKey(new Date(now)));
}
export function startFocus(store: AppStore, taskId: string, now = Date.now()): AppStore {
  const task = store.plan?.tasks.find(t => t.id === taskId);
  if (!task || store.focus?.taskId === taskId) return store;
  const next = settleFocus(store, now);
  return { ...next, focus: { taskId, subject: task.subject, taskTitle: task.title, startedAt: now } };
}
export function pauseFocus(store: AppStore, now = Date.now()): AppStore { return settleFocus(store, now); }
