import type { AppStore } from "./types";

const MILESTONES = [3, 7, 14, 21, 30, 50, 100] as const;

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

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function checkedDates(store: AppStore) {
  const set = new Set(store.checkIns.map((c) => c.date));
  const today = dateKey(new Date());
  const allDone =
    !!store.plan?.tasks.length && store.plan.tasks.every((t) => t.done);
  if (allDone) set.add(today);
  return set;
}

/** 近 N 日有打卡天数 / N，返回 0–100 */
export function persistenceRate(store: AppStore, days: number): number {
  const set = checkedDates(store);
  let hit = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (set.has(dateKey(d))) hit += 1;
  }
  return Math.round((hit / days) * 100);
}

export function examCountdownDays(examDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return 0;
  const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  return Math.max(0, diff);
}

export type MilestoneBadge = {
  days: number;
  title: string;
  earned: boolean;
};

export function milestoneBadges(streak: number): MilestoneBadge[] {
  const titles: Record<number, string> = {
    3: "初露锋芒",
    7: "一周战士",
    14: "两周坚盾",
    21: "三周习惯",
    30: "月度学霸",
    50: "铁打自律",
    100: "百日长征",
  };
  return MILESTONES.map((days) => ({
    days,
    title: titles[days] ?? `${days} 日勋章`,
    earned: streak >= days,
  }));
}

