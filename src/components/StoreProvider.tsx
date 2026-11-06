"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  adjustPlanByProgress,
  applyTemplate,
  deleteTemplate,
  loadStore,
  saveStore,
  submitCheckIn,
  toggleTask,
  updateTaskMinutes,
  upsertRule,
  upsertScript,
  upsertTemplate,
} from "@/lib/store";
import type {
  AppStore,
  PlanTemplate,
  ReminderRule,
  ScriptItem,
} from "@/lib/types";

type StoreApi = {
  store: AppStore | null;
  ready: boolean;
  setUserName: (name: string) => void;
  chooseTemplate: (template: PlanTemplate, userName?: string) => void;
  saveTemplate: (template: PlanTemplate) => void;
  removeTemplate: (templateId: string) => void;
  toggleTask: (taskId: string) => void;
  updateTaskMinutes: (taskId: string, minutes: number) => void;
  checkIn: (note: string) => void;
  saveScript: (script: ScriptItem) => void;
  saveRule: (rule: ReminderRule) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AppStore | null>(null);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const commit = useCallback((next: AppStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  const api = useMemo<StoreApi>(
    () => ({
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
      saveTemplate(template: PlanTemplate) {
        if (!store) return;
        commit(upsertTemplate(store, template));
      },
      removeTemplate(templateId: string) {
        if (!store) return;
        commit(deleteTemplate(store, templateId));
      },
      toggleTask(taskId: string) {
        if (!store) return;
        commit(toggleTask(store, taskId));
      },
      updateTaskMinutes(taskId: string, minutes: number) {
        if (!store) return;
        commit(updateTaskMinutes(store, taskId, minutes));
      },
      checkIn(note: string) {
        if (!store) return;
        commit(adjustPlanByProgress(submitCheckIn(store, note)));
      },
      saveScript(script: ScriptItem) {
        if (!store) return;
        commit(upsertScript(store, script));
      },
      saveRule(rule: ReminderRule) {
        if (!store) return;
        commit(upsertRule(store, rule));
      },
    }),
    [store, commit],
  );

  return (
    <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within StoreProvider");
  }
  return ctx;
}
