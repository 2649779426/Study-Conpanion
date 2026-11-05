"use client";
import { useEffect, useState } from "react";

export function useStudyNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const init = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), active ? 1000 : 20000);
    return () => { clearTimeout(init); clearInterval(timer); };
  }, [active]);
  return now;
}
