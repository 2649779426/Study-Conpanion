import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSeedStore } from "./seed";
import { aggregateDays, subjectShares, weeklySummary, reviewTotals, reviewTimeline } from "./review";
import { loadSampleRecords, clearSampleRecords, hasSampleRecords } from "./samples";
import { startFocus } from "./focus";
import { submitCheckIn, adjustPlanByProgress } from "./store";
import type { FocusRecord } from "./types";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T02:00:00Z")); });
afterEach(() => vi.useRealTimers());
function focus(date: string, subject: string, seconds: number): FocusRecord {
  return { id: `${date}-${subject}`, date, taskId: subject, subject, seconds };
}
it("14天补齐零值、包括当天、排除区间外数据，完成率来自当天打卡", () => {
  const store = submitCheckIn(createSeedStore(), "部分");
  store.checkIns[0].taskIds = ["t1"];
  store.focusRecords = [focus("2026-10-22", "英语", 600), focus("2026-10-23", "英语", 61), focus("2026-11-05", "政治", 125)];
  const days = aggregateDays(store);
  expect(days).toHaveLength(14);
  expect(days[0]).toMatchObject({ date: "2026-10-23", seconds: 61, minutes: 1 });
  expect(days[1].seconds).toBe(0);
  expect(days[13]).toMatchObject({ date: "2026-11-05", seconds: 125, minutes: 2, rate: 25 });
});
it("各科占比按秒计算，分钟统一向下取整，零数据为空", () => {
  const store = createSeedStore();
  expect(subjectShares(store)).toEqual([]);
  store.focusRecords = [focus("2026-11-04", "英语", 90), focus("2026-11-05", "英语", 30), focus("2026-11-05", "政治", 40)];
  expect(subjectShares(store)).toEqual([
    { subject: "英语", seconds: 120, minutes: 2, percent: 75 },
    { subject: "政治", seconds: 40, minutes: 0, percent: 25 },
  ]);
});
it("本周小结计算周一到今天、与完整上周的增减及环比，识别薄弱科目", () => {
  const store = createSeedStore();
  store.plan!.tasks[0].done = true;
  const checked = submitCheckIn(store, "阅读完成");
  checked.focusRecords = [focus("2026-11-02", "英语", 3600), focus("2026-11-05", "政治", 1800), focus("2026-10-27", "英语", 1800), focus("2026-11-06", "英语", 99999)];
  const text = weeklySummary(checked);
  expect(text).toContain("本周专注 1 小时 30 分钟");
  expect(text).toContain("比上周多 1 小时 0 分钟");
  expect(text).toContain("+200%");
  expect(text).toContain("最常学的科目是英语");
  expect(text).toContain("未完成最多的科目");
  checked.focusRecords = [focus("2026-10-27", "英语", 1800)];
  expect(weeklySummary(checked)).toContain("比上周少 0 小时 30 分钟");
  expect(weeklySummary(checked)).toContain("-100%");
  expect(weeklySummary(createSeedStore())).toContain("暂无专注记录");
  checked.focusRecords = [focus("2026-11-02", "英语", 60)];
  expect(weeklySummary(checked)).toContain("上周暂无专注记录，环比暂无基数");
});
it("示例载入幂等、偶有断签、跳过真实记录所在日期、今天和当前计时不动，清除仅删sample", () => {
  let store = submitCheckIn(createSeedStore(), "今天真实");
  const yesterday = { ...store.checkIns[0], id: "real-yesterday", date: "2026-11-04", note: "昨天真实" };
  store.checkIns.push(yesterday);
  store.focusRecords = [focus("2026-11-04", "英语", 100)];
  store = startFocus(store, "t1");
  const original = JSON.parse(JSON.stringify(store));
  const loaded = loadSampleRecords(store);
  const sample = loaded.checkIns.filter(r => r.sample);
  expect(sample.length).toBeGreaterThan(5); expect(sample.length).toBeLessThan(13);
  expect(sample.every(r => r.date < "2026-11-05" && r.date >= "2026-10-23")).toBe(true);
  expect(loaded.focusRecords.filter(r => r.sample).every(r => r.date !== "2026-11-04")).toBe(true);
  expect(loaded.checkIns.filter(r => !r.sample)).toEqual(original.checkIns);
  expect(loaded.plan!.tasks).toEqual(original.plan.tasks);
  expect(loaded.focus).toEqual(original.focus);
  expect(loadSampleRecords(loaded)).toEqual(loaded);
  expect(hasSampleRecords(loaded)).toBe(true);
  const cleared = clearSampleRecords(loaded);
  expect(cleared.checkIns).toEqual(original.checkIns);
  expect(cleared.focusRecords).toEqual(original.focusRecords);
  expect(cleared.focus).toEqual(original.focus);
  expect(hasSampleRecords(cleared)).toBe(false);
});
it("回顾保留任务标题、调整与备注；纯专注未打卡日期也出现；累计任务不因同日更新重复", () => {
  let store = createSeedStore(); store.plan!.tasks[0].done = true;
  store = adjustPlanByProgress(submitCheckIn(store, "今天较累"));
  store.focusRecords = [focus("2026-11-04", "英语", 61)];
  const timeline = reviewTimeline(store);
  expect(timeline.map(r => r.date)).toEqual(["2026-11-05", "2026-11-04"]);
  expect(timeline[0].checkIn!.tasks![0].title).toBe("英语真题阅读 × 2 篇");
  expect(timeline[0].checkIn!.adjustments![0].mode).toBe("精简");
  expect(timeline[1].seconds).toBe(61);
  expect(reviewTotals(store)).toMatchObject({ seconds: 61, checkInDays: 1, completedTasks: 1 });
});
