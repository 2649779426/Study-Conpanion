"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastCtx = {
  show: (message: string) => void;
};

const Ctx = createContext<ToastCtx>({ show: () => undefined });

export function useToast() {
  return useContext(Ctx);
}

export function DemoToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {message ? <div className="toast">{message}</div> : null}
    </Ctx.Provider>
  );
}
