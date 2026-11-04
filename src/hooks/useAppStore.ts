"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adjustPlanByProgress,
  applyTemplate,
  loadStore,
  saveStore,
  submitCheckIn,
  toggleTask,
  upsertRule,
  upsertScript,
} from "@/lib/store";
import type {
  AppStore,
  PlanTemplate,
  ReminderRule,
  ScriptItem,
} from "@/lib/types";

export function useAppStore() {
  const [store, setStore] = useState<AppStore | null>(null);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const commit = useCallback((next: AppStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  return {
    store,
    ready: !!store,
    setUserName(name: string) {
      if (!store) return;
      commit({ ...store, userName: name });
    },
    chooseTemplate(template: PlanTemplate, userName?: string) {
      if (!store) return;
      commit(applyTemplate(store, template, userName));
    },
    toggleTask(taskId: string) {
      if (!store) return;
      commit(toggleTask(store, taskId));
    },
    checkIn(note: string) {
      if (!store) return;
      const withCheckIn = submitCheckIn(store, note);
      commit(adjustPlanByProgress(withCheckIn));
    },
    saveScript(script: ScriptItem) {
      if (!store) return;
      commit(upsertScript(store, script));
    },
    saveRule(rule: ReminderRule) {
      if (!store) return;
      commit(upsertRule(store, rule));
    },
    resetDemo() {
      window.localStorage.removeItem("kaoyan-duxue-store-v1");
      commit(loadStore());
    },
  };
}
