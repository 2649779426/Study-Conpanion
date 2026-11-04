"use client";

import { AppShell } from "@/components/AppShell";
import { DemoToastProvider } from "@/components/DemoToast";
import { StoreProvider } from "@/components/StoreProvider";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <DemoToastProvider>
      <StoreProvider>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    </DemoToastProvider>
  );
}
