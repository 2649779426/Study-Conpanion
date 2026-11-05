import { shiftDay, todayKey } from "./date";
import { calculateStreak } from "./store";
import type { AppStore, CheckInRecord, FocusRecord } from "./types";

export function hasSampleRecords(store: AppStore): boolean {
  return store.checkIns.some(r => r.sample) || store.focusRecords.some(r => r.sample);
}
export function clearSampleRecords(store: AppStore): AppStore {
  const checkIns = store.checkIns.filter(r => !r.sample);
  return { ...store, checkIns, focusRecords: store.focusRecords.filter(r => !r.sample),
    plan: store.plan ? { ...store.plan, streak: calculateStreak(checkIns) } : null };
}
/** 仅补过去13天，留出两天断签；任何真实记录占用的日期都跳过，今天与当前任务不动。 */
export function loadSampleRecords(store: AppStore, today = todayKey()): AppStore {
  const clean = clearSampleRecords(store);
  const occupied = new Set([...clean.checkIns.map(r => r.date), ...clean.focusRecords.map(r => r.date)]);
  const checkIns: CheckInRecord[] = [];
  const focusRecords: FocusRecord[] = [];
  const titles = ["英语真题阅读", "政治错题回顾", "专业课框架默写", "晚间学习复盘"];
  const subjects = ["英语", "政治", "专业课", "复盘"];
  const minutes = [60, 40, 50, 15];
  for (let offset = 13; offset >= 1; offset--) {
    const date = shiftDay(today, -offset);
    if (offset === 4 || offset === 9 || occupied.has(date)) continue;
    const tasks = titles.map((title, i) => {
      const id = `sample-${date}-t${i}`;
      const done = offset % 3 !== 0 || i < 2;
      const seconds = Math.round(minutes[i] * (0.55 + ((offset * 7 + i * 3) % 6) * 0.08) * 60);
      focusRecords.push({ id: `${id}-focus`, date, taskId: id, subject: subjects[i], taskTitle: title, seconds, sample: true });
      return { id, title, baseTitle: title, subject: subjects[i], minutes: minutes[i], baseMinutes: minutes[i],
        actualSeconds: seconds, actualMinutes: Math.floor(seconds / 60), done };
    });
    const subjectSeconds = Object.fromEntries(tasks.map(t => [t.subject, t.actualSeconds]));
    checkIns.push({ id: `sample-check-${date}`, date, tasks, taskIds: tasks.filter(t => t.done).map(t => t.id),
      totalTasks: tasks.length, allDone: tasks.every(t => t.done), sample: true,
      note: offset % 3 === 0 ? "示例：今天状态一般，明天优先回顾专业课。" : "示例：按计划完成，错题已整理。",
      createdAt: `${date}T21:30:00+08:00`, subjectSeconds, plannedMinutes: 165,
      subjectPlannedMinutes: Object.fromEntries(tasks.map(t => [t.subject, t.minutes])),
      adjustments: offset % 3 === 0 ? [{ taskId: tasks[2].id, title: tasks[2].title, mode: "精简", before: 50, after: 40 }] : [],
    });
  }
  const combined = [...clean.checkIns, ...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  return { ...clean, checkIns: combined, focusRecords: [...clean.focusRecords, ...focusRecords],
    plan: clean.plan ? { ...clean.plan, streak: calculateStreak(combined, today) } : null };
}
