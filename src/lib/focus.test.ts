import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSeedStore } from "./seed";
import { normalizeStore, submitCheckIn, applyTemplate } from "./store";
import { startFocus, pauseFocus, taskFocusSeconds, focusRecordsAt } from "./focus";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T02:00:00Z")); });
afterEach(() => vi.useRealTimers());
it("暂停续上按秒累计，不因分钟向下取整丢失余秒", () => {
  let store = startFocus(createSeedStore(), "t1");
  vi.advanceTimersByTime(39900); store = pauseFocus(store);
  expect(store.plan!.tasks[0].actualMinutes).toBe(0);
  expect(store.focusRecords[0].seconds).toBe(39);
  vi.advanceTimersByTime(50000); store = startFocus(store, "t1");
  vi.advanceTimersByTime(21100); store = pauseFocus(store);
  expect(taskFocusSeconds(store, "t1")).toBe(61);
  expect(store.plan!.tasks[0].actualMinutes).toBe(1);
  expect(store.focusRecords.reduce((n, r) => n + r.seconds, 0)).toBe(61);
  expect(store.focus).toBeNull();
});
it("刷新恢复使用原开始时间，重复开始同一任务不重置，切换任务只保留一个计时", () => {
  let store = startFocus(createSeedStore(), "t1");
  vi.advanceTimersByTime(65000);
  store = normalizeStore(JSON.parse(JSON.stringify(store)));
  expect(taskFocusSeconds(store, "t1")).toBe(65);
  store = startFocus(store, "t1");
  vi.advanceTimersByTime(5000); store = startFocus(store, "t2");
  expect(store.plan!.tasks[0].actualMinutes).toBe(1);
  vi.advanceTimersByTime(30000); store = pauseFocus(store);
  expect(taskFocusSeconds(store, "t1")).toBe(70);
  expect(taskFocusSeconds(store, "t2")).toBe(30);
  expect(pauseFocus(store).focusRecords).toEqual(store.focusRecords);
});
it("跨北京时间午夜按天拆分，刷新和归一化不重复计时", () => {
  vi.setSystemTime(new Date("2026-11-05T15:59:30Z"));
  let store = startFocus(createSeedStore(), "t1");
  vi.advanceTimersByTime(90000);
  store = normalizeStore(store); store = normalizeStore(store);
  expect(store.taskDate).toBe("2026-11-06");
  expect(taskFocusSeconds(store, "t1")).toBe(60);
  store = pauseFocus(store);
  expect(store.focusRecords.map(r => [r.date, r.seconds])).toEqual([["2026-11-05", 30], ["2026-11-06", 60]]);
});
it("提交打卡先结算计时，保存各科秒数和原计划快照，换模板不抹掉历史", () => {
  let store = startFocus(createSeedStore(), "t1");
  vi.advanceTimersByTime(125000);
  store = submitCheckIn(store, "阅读完成");
  expect(store.focus).toBeNull();
  expect(store.checkIns[0].subjectSeconds).toEqual({ 英语: 125 });
  expect(store.checkIns[0].plannedMinutes).toBe(165);
  expect(store.checkIns[0].tasks![0].title).toBe("英语真题阅读 × 2 篇");
  store = startFocus(store, "t2"); vi.advanceTimersByTime(15000);
  store = applyTemplate(store, store.templates[1]);
  expect(store.focus).toBeNull();
  expect(store.checkIns[0].tasks![0].title).toBe("英语真题阅读 × 2 篇");
  expect(focusRecordsAt(store).reduce((n, r) => n + r.seconds, 0)).toBe(140);
});
