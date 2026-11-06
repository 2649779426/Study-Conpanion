"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: string;
  phone: string;
};

type AuthApi = {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<string | null>;
  register: (phone: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

async function readError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || "请求失败";
  } catch {
    return "请求失败";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      ready,
      async login(phone: string, password: string) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });
        if (!res.ok) return readError(res);
        const data = (await res.json()) as { user: AuthUser };
        setUser(data.user);
        return null;
      },
      async register(phone: string, password: string) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });
        if (!res.ok) return readError(res);
        const data = (await res.json()) as { user: AuthUser };
        setUser(data.user);
        return null;
      },
      async logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
      refresh,
    }),
    [user, ready, refresh],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
