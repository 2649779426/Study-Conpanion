"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "今日督学" },
  { href: "/plan", label: "学习计划" },
  { href: "/checkin", label: "进度打卡" },
  { href: "/admin", label: "后台配置" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">督</span>
          <span>
            <strong>考研督学数字人</strong>
            <em>方案一 · 播报陪伴 Demo</em>
          </span>
        </Link>
        <nav className="nav">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
