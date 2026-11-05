import type { AppStore } from "./types";

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${h} 小时`;
  return `${h} 小时 ${rest} 分`;
}

export function formatHoursShort(minutes: number): string {
  const h = Math.max(0, minutes) / 60;
  if (h < 10) return h.toFixed(1).replace(/\.0$/, "");
  return String(Math.round(h));
}

/** 今日已完成任务计划时长（分钟） */
export function todayDoneMinutes(store: AppStore): number {
  return (
    store.plan?.tasks
      .filter((t) => t.done)
      .reduce((sum, t) => sum + t.minutes, 0) ?? 0
  );
}

/** 今日计划总时长 */
export function todayPlanMinutes(store: AppStore): number {
  return store.plan?.tasks.reduce((sum, t) => sum + t.minutes, 0) ?? 0;
}

/**
 * 累计学习时长：历史打卡记录分钟数 +
 * 若今日尚无打卡，则加上当前已勾选完成的任务时长（避免重复）。
 */
export function cumulativeMinutes(store: AppStore): number {
  const today = new Date().toISOString().slice(0, 10);
  const fromRecords = store.checkIns.reduce(
    (sum, c) => sum + (c.minutes ?? 0),
    0,
  );
  const hasTodayCheckIn = store.checkIns.some((c) => c.date === today);
  if (hasTodayCheckIn) return fromRecords;
  return fromRecords + todayDoneMinutes(store);
}

export function recentDailyMinutes(store: AppStore, days = 7): {
  date: string;
  label: string;
  minutes: number;
}[] {
  const map = new Map<string, number>();
  for (const c of store.checkIns) {
    map.set(c.date, (map.get(c.date) ?? 0) + (c.minutes ?? 0));
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!map.has(today)) {
    map.set(today, todayDoneMinutes(store));
  }

  const result: { date: string; label: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    result.push({ date: key, label, minutes: map.get(key) ?? 0 });
  }
  return result;
}
