"use client";

import { createSeedStore, STORAGE_KEY } from "./seed";
import type {
  AppStore,
  CheckInRecord,
  PlanTemplate,
  ReminderRule,
  ScriptItem,
  StudyPlan,
} from "./types";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadStore(): AppStore {
  if (!canUseStorage()) return createSeedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return { ...createSeedStore(), ...JSON.parse(raw) } as AppStore;
  } catch {
    return createSeedStore();
  }
}

export function saveStore(store: AppStore) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function applyTemplate(
  store: AppStore,
  template: PlanTemplate,
  userName?: string,
): AppStore {
  const today = new Date().toISOString().slice(0, 10);
  const plan: StudyPlan = {
    id: `plan-${Date.now()}`,
    templateId: template.id,
    name: template.name,
    examTarget: template.examTarget,
    startDate: today,
    streak: store.plan?.streak ?? 0,
    tasks: template.tasks.map((title, index) => ({
      id: `task-${Date.now()}-${index}`,
      title,
      subject: template.subjects[index % template.subjects.length] ?? "综合",
      minutes: Math.max(20, Math.round(template.dailyMinutes / template.tasks.length)),
      done: false,
    })),
  };

  return {
    ...store,
    userName: userName?.trim() || store.userName,
    plan,
  };
}

export function toggleTask(store: AppStore, taskId: string): AppStore {
  if (!store.plan) return store;
  return {
    ...store,
    plan: {
      ...store.plan,
      tasks: store.plan.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    },
  };
}

export function updateTaskMinutes(
  store: AppStore,
  taskId: string,
  minutes: number,
): AppStore {
  if (!store.plan) return store;
  const next = Math.max(5, Math.min(480, Math.round(minutes) || 5));
  return {
    ...store,
    plan: {
      ...store.plan,
      tasks: store.plan.tasks.map((task) =>
        task.id === taskId ? { ...task, minutes: next } : task,
      ),
    },
  };
}

export function submitCheckIn(store: AppStore, note: string): AppStore {
  if (!store.plan) return store;
  const doneTasks = store.plan.tasks.filter((t) => t.done);
  const doneIds = doneTasks.map((t) => t.id);
  const minutes = doneTasks.reduce((sum, t) => sum + t.minutes, 0);
  const today = new Date().toISOString().slice(0, 10);
  const record: CheckInRecord = {
    id: `check-${Date.now()}`,
    date: today,
    taskIds: doneIds,
    minutes,
    note,
    createdAt: new Date().toISOString(),
  };

  const allDone = store.plan.tasks.length > 0 && store.plan.tasks.every((t) => t.done);

  return {
    ...store,
    plan: {
      ...store.plan,
      streak: allDone ? store.plan.streak + 1 : store.plan.streak,
    },
    checkIns: [record, ...store.checkIns].slice(0, 30),
  };
}

export function upsertScript(store: AppStore, script: ScriptItem): AppStore {
  const exists = store.scripts.some((s) => s.id === script.id);
  return {
    ...store,
    scripts: exists
      ? store.scripts.map((s) => (s.id === script.id ? script : s))
      : [script, ...store.scripts],
  };
}

export function upsertRule(store: AppStore, rule: ReminderRule): AppStore {
  const exists = store.rules.some((r) => r.id === rule.id);
  return {
    ...store,
    rules: exists
      ? store.rules.map((r) => (r.id === rule.id ? rule : r))
      : [rule, ...store.rules],
  };
}

export function adjustPlanByProgress(store: AppStore): AppStore {
  if (!store.plan) return store;
  const doneCount = store.plan.tasks.filter((t) => t.done).length;
  const total = store.plan.tasks.length || 1;
  const ratio = doneCount / total;

  if (ratio >= 0.75) {
    return {
      ...store,
      plan: {
        ...store.plan,
        tasks: store.plan.tasks.map((task) =>
          task.done
            ? task
            : {
                ...task,
                title: task.title.includes("（加练）")
                  ? task.title
                  : `${task.title}（加练）`,
                minutes: task.minutes + 10,
              },
        ),
      },
    };
  }

  if (ratio > 0 && ratio < 0.4) {
    return {
      ...store,
      plan: {
        ...store.plan,
        tasks: store.plan.tasks.map((task) =>
          task.done
            ? task
            : {
                ...task,
                title: task.title.replace("（加练）", "").replace("（精简）", "") + "（精简）",
                minutes: Math.max(15, task.minutes - 10),
              },
        ),
      },
    };
  }

  return store;
}
