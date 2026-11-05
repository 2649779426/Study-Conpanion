import { shiftDay, todayKey } from "./date";
import { focusRecordsAt } from "./focus";
import { calculateStreak } from "./store";
import type { AppStore, FocusRecord } from "./types";

export function durationText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}
export function subjectShares(store: AppStore, records = focusRecordsAt(store)) {
  const sums = new Map<string, number>();
  for (const r of records) sums.set(r.subject, (sums.get(r.subject) ?? 0) + r.seconds);
  const total = [...sums.values()].reduce((n, s) => n + s, 0);
  return [...sums].filter(([, seconds]) => seconds > 0).map(([subject, seconds]) => ({ subject, seconds,
    minutes: Math.floor(seconds / 60), percent: Math.round(seconds / total * 1000) / 10,
  })).sort((a, b) => b.seconds - a.seconds || a.subject.localeCompare(b.subject, "zh-CN"));
}
export function aggregateDays(store: AppStore, count = 14, today = todayKey(), now = Date.now()) {
  const records = focusRecordsAt(store, now);
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDay(today, i - count + 1);
    const checkIn = store.checkIns.find(r => r.date === date);
    const seconds = records.filter(r => r.date === date).reduce((n, r) => n + r.seconds, 0);
    return { date, seconds, minutes: Math.floor(seconds / 60),
      rate: checkIn?.totalTasks ? Math.round(checkIn.taskIds.length / checkIn.totalTasks * 100) : 0,
      checkedIn: !!checkIn, completionKnown: !!checkIn?.totalTasks,
    };
  });
}
export function reviewTotals(store: AppStore, now = Date.now()) {
  const today = todayKey(new Date(now));
  const records = store.checkIns.filter(r => r.date <= today);
  return { seconds: focusRecordsAt(store, now).filter(r => r.date <= today).reduce((n, r) => n + r.seconds, 0),
    checkInDays: new Set(records.map(r => r.date)).size, streak: calculateStreak(records, today),
    completedTasks: records.reduce((n, r) => n + new Set(r.taskIds).size, 0) };
}
export function reviewTimeline(store: AppStore, now = Date.now()) {
  const records = focusRecordsAt(store, now);
  const today = todayKey(new Date(now));
  const dates = new Set([...store.checkIns.map(r => r.date), ...records.map(r => r.date)]);
  return [...dates].filter(d => d <= today).sort((a, b) => b.localeCompare(a)).map(date => {
    const checkIn = store.checkIns.find(r => r.date === date);
    const sessions = records.filter(r => r.date === date);
    return { date, checkIn, sessions, seconds: sessions.reduce((n, r) => n + r.seconds, 0),
      sample: !!checkIn?.sample || sessions.some(r => r.sample) };
  });
}
/** 本周=北京时间周一至今天；对比对象是上周一至周日整周，UI明确标注口径。 */
export function weeklySummary(store: AppStore, now = Date.now()): string {
  const today = todayKey(new Date(now));
  const weekday = new Date(`${today}T12:00:00+08:00`).getUTCDay();
  const monday = shiftDay(today, -(weekday + 6) % 7);
  const lastMonday = shiftDay(monday, -7);
  const records = focusRecordsAt(store, now);
  const current = records.filter(r => r.date >= monday && r.date <= today);
  const previous = records.filter(r => r.date >= lastMonday && r.date < monday);
  const sum = (list: FocusRecord[]) => list.reduce((n, r) => n + r.seconds, 0);
  const seconds = sum(current), last = sum(previous), diff = seconds - last;
  const comparison = last ? diff === 0 ? "与上周持平（环比 0%）"
    : `比上周${diff > 0 ? "多" : "少"} ${durationText(Math.abs(diff))}（环比 ${diff > 0 ? "+" : ""}${Math.round(diff / last * 100)}%）`
    : "上周暂无专注记录，环比暂无基数";
  const top = subjectShares(store, current)[0];
  const unfinished = new Map<string, number>();
  for (const r of store.checkIns.filter(r => r.date >= monday && r.date <= today)) {
    for (const task of r.tasks ?? []) if (!r.taskIds.includes(task.id)) unfinished.set(task.subject, (unfinished.get(task.subject) ?? 0) + 1);
  }
  const ranked = [...unfinished].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
  const weak = ranked.filter(([, count]) => count === ranked[0]?.[1]);
  return `本周专注 ${durationText(seconds)}，${comparison}。${top ? `最常学的科目是${top.subject}（${Math.floor(top.seconds / 60)} 分钟）。` : "本周暂无专注记录，从今天的一个小任务开始吧。"}${weak.length ? `未完成最多的科目：${weak.map(([subject]) => subject).join("、")}（各 ${weak[0][1]} 项），下次可优先安排。` : "本周暂无未完成任务快照，完成任务后记得提交打卡。"}`;
}
