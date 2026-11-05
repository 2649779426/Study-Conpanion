import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeedStore } from "./seed";
import { adjustPlanByProgress, submitCheckIn, normalizeStore, calculateStreak, shouldTriggerRule, triggerRule, updateVideoJob, noticeKey, upsertScript } from "./store";
import { todayKey } from "./date";
import type { CheckInRecord, StudyTask } from "./types";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T02:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("打卡回归", () => {
  it("同一天重复提交覆盖当天记录，不增加连续天数", () => {
    const store = createSeedStore();
    store.plan!.tasks.forEach(t => { t.done = true; });
    const first = submitCheckIn(store, "第一次");
    const second = submitCheckIn(first, "更新");
    expect(second.checkIns).toHaveLength(1);
    expect(second.checkIns[0].note).toBe("更新");
    expect(second.plan!.streak).toBe(1);
  });
  it("加练不在重复提交时累加", () => {
    const store = createSeedStore();
    store.plan!.tasks.slice(0, 3).forEach(t => { t.done = true; });
    const first = adjustPlanByProgress(store);
    const second = adjustPlanByProgress(first);
    expect(second.plan!.tasks[3].minutes).toBe(25);
    expect(second.plan!.tasks[3].title).toBe("晚间复盘与明日预告（加练）");
  });
  it("精简不在重复提交时累减", () => {
    const store = createSeedStore(); store.plan!.tasks[0].done = true;
    const result = adjustPlanByProgress(adjustPlanByProgress(store));
    expect(result.plan!.tasks[1].minutes).toBe(30);
  });
});

it.each([
  ["2026-11-04T15:59:59Z", "2026-11-04"],
  ["2026-11-04T16:00:00Z", "2026-11-05"],
  ["2026-11-04T23:59:59Z", "2026-11-05"],
  ["2026-12-31T16:00:00Z", "2027-01-01"],
])("北京时间日期 %s → %s", (instant, expected) => {
  expect(todayKey(new Date(instant))).toBe(expected);
});

function record(date: string, allDone = true): CheckInRecord {
  return { id: date, date, allDone, taskIds: allDone ? ["a"] : [], totalTasks: 1, note: "", createdAt: date };
}
it("连续天数从今天或昨天的真实全完成记录推算，断签归零", () => {
  expect(calculateStreak([record("2026-11-05"), record("2026-11-04"), record("2026-11-02")])).toBe(2);
  expect(calculateStreak([record("2026-11-05", false), record("2026-11-04"), record("2026-11-03")])).toBe(2);
  expect(calculateStreak([record("2026-11-03")])).toBe(0);
  expect(calculateStreak([record("2026-11-05"), record("2026-11-04", false), record("2026-11-03")])).toBe(1);
});
it("打开新一天自动清除完成状态并保留历史", () => {
  const store = createSeedStore();
  store.plan!.tasks.forEach(t => { t.done = true; });
  const checked = submitCheckIn(store, "完成");
  vi.setSystemTime(new Date("2026-11-05T16:01:00Z"));
  const next = normalizeStore(checked);
  expect(next.taskDate).toBe("2026-11-06");
  expect(next.plan!.tasks.every(t => !t.done)).toBe(true);
  expect(next.checkIns).toHaveLength(1);
  expect(next.plan!.streak).toBe(1);
  const partial = submitCheckIn(next, "新一天");
  expect(partial.checkIns).toHaveLength(2);
  expect(partial.checkIns[0].allDone).toBe(false);
});
it("迁移旧模板任务时从模板原始时长恢复，不能把已加练时长当基数", () => {
  const store = createSeedStore();
  store.plan!.templateId = "tpl-english-focus";
  store.plan!.tasks = [{ id: "legacy", title: "单词 100 个（加练）", subject: "英语", minutes: 60, done: false } as StudyTask];
  const migrated = normalizeStore(store);
  expect(migrated.plan!.tasks[0].baseMinutes).toBe(30);
  expect(migrated.plan!.tasks[0].baseTitle).toBe("单词 100 个");
});
it("同日更新成部分完成会撤回当天连续计数", () => {
  const store = createSeedStore(); store.plan!.tasks.forEach(t => { t.done = true; });
  const first = submitCheckIn(store, "全部完成");
  first.plan!.tasks[0].done = false;
  const updated = submitCheckIn(first, "修正");
  expect(updated.checkIns).toHaveLength(1);
  expect(updated.plan!.streak).toBe(0);
});
it("提醒到点触发且当天去重，次日可以再次触发", () => {
  const store = createSeedStore(); const rule = store.rules[0];
  expect(shouldTriggerRule(store, rule, new Date("2026-11-05T00:29:59Z"))).toBe(false);
  expect(shouldTriggerRule(store, rule, new Date("2026-11-05T00:30:00Z"))).toBe(true);
  const triggered = triggerRule(store, rule);
  expect(triggered.messages).toHaveLength(1);
  expect(triggered.broadcasts).toHaveLength(1);
  expect(triggerRule(triggered, rule).messages).toHaveLength(1);
  expect(shouldTriggerRule(triggered, rule, new Date("2026-11-06T00:30:00Z"))).toBe(true);
});
it("停用规则不触发，reminder 仅有未完成任务才触发", () => {
  const store = createSeedStore(); const rule = store.rules[1];
  const now = new Date("2026-11-05T06:00:00Z");
  expect(shouldTriggerRule(store, rule, now)).toBe(true);
  expect(shouldTriggerRule(store, { ...rule, enabled: false }, now)).toBe(false);
  store.plan!.tasks.forEach(t => { t.done = true; });
  expect(shouldTriggerRule(store, rule, now)).toBe(false);
  expect(shouldTriggerRule(store, { ...rule, scene: "opening" }, now)).toBe(true);
  expect(shouldTriggerRule(store, { ...rule, scene: "review" }, now)).toBe(true);
  store.plan = null;
  expect(shouldTriggerRule(store, rule, now)).toBe(false);
});
it("手动试触发如实记录且不消耗当天自动触发", () => {
  const store = createSeedStore(); const rule = store.rules[2];
  const result = triggerRule(store, rule, true);
  expect(result.messages[0].text).toContain("手动试触发");
  expect(result.triggeredRules[rule.id]).toBeUndefined();
});
it("固定话术场景并阻止新增同场景话术", () => {
  const store = createSeedStore();
  expect(upsertScript(store, { ...store.scripts[0], scene: "review" })).toBe(store);
  expect(upsertScript(store, { ...store.scripts[0], id: "duplicate" })).toBe(store);
});
it("真实视频完成只写一次消息，公告内容变化视为新公告", () => {
  const store = createSeedStore();
  const job = { jobId: "j1", hash: "h", scene: "opening" as const, text: "你好", status: "completed" as const, url: "/generated/h.mp4", createdAt: "" };
  const first = updateVideoJob(store, job);
  expect(first.messages).toHaveLength(1);
  expect(updateVideoJob(first, job).messages).toHaveLength(1);
  expect(noticeKey(store.rules[0])).not.toBe(noticeKey({ ...store.rules[0], time: "09:00" }));
});
