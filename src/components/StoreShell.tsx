"use client";

import { AppShell } from "@/components/AppShell";
import { useAppStore } from "@/hooks/useAppStore";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { store, ready } = useAppStore();
  return (
    <AppShell userName={ready && store ? store.userName : "同学"}>
      {children}
    </AppShell>
  );
}
