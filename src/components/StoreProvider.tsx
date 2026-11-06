"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  adjustPlanByProgress,
  applyTemplate,
  deleteTemplate,
  submitCheckIn,
  toggleTask,
  updateTaskMinutes,
  upsertRule,
  upsertScript,
  upsertTemplate,
} from "@/lib/store";
import { createSeedStore } from "@/lib/seed";
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
  updateSettings: (
    patch: Partial<
      Pick<
        AppStore,
        | "examDate"
        | "smsReminderEnabled"
        | "smsReminderTime"
        | "userName"
      >
    >,
  ) => void;
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
  const { user, ready: authReady } = useAuth();
  const [store, setStore] = useState<AppStore | null>(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitMarked = useRef(false);
  const userId = user?.id ?? null;

  const persist = useCallback((next: AppStore) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch("/api/user/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: next }),
      });
    }, 250);
  }, []);

  const commit = useCallback(
    (next: AppStore) => {
      setStore(next);
      persist(next);
    },
    [persist],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      setStore(null);
      setReady(false);
      visitMarked.current = false;
      return;
    }

    let cancelled = false;
    setReady(false);
    visitMarked.current = false;
    (async () => {
      try {
        const res = await fetch("/api/user/data", { cache: "no-store" });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { store: AppStore };
        if (cancelled) return;
        const merged: AppStore = {
          ...createSeedStore(),
          ...data.store,
          lastVisitAt: new Date().toISOString(),
        };
        setStore(merged);
        setReady(true);
        visitMarked.current = true;
        persist(merged);
      } catch {
        if (!cancelled) {
          const seed = {
            ...createSeedStore(),
            lastVisitAt: new Date().toISOString(),
          };
          setStore(seed);
          setReady(true);
          persist(seed);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, persist]);

  const api = useMemo<StoreApi>(
    () => ({
      store,
      ready: ready && !!store,
      setUserName(name: string) {
        if (!store) return;
        commit({ ...store, userName: name });
      },
      updateSettings(patch) {
        if (!store) return;
        commit({ ...store, ...patch });
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
    [store, ready, commit],
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
