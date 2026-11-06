"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { DemoToastProvider } from "@/components/DemoToast";
import { StoreProvider } from "@/components/StoreProvider";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!ready) return;
    if (!user && !isLogin) router.replace("/login");
    if (user && isLogin) router.replace("/");
  }, [ready, user, isLogin, router]);

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="card">加载中…</div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <DemoToastProvider>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </DemoToastProvider>
  );
}
