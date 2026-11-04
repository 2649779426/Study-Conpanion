"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  {
    title: "MENU",
    items: [
      { href: "/", label: "今日督学", icon: "/home.png" },
      { href: "/plan", label: "学习计划", icon: "/lesson.png" },
      { href: "/checkin", label: "进度打卡", icon: "/attendance.png" },
      { href: "/admin", label: "后台配置", icon: "/setting.png" },
    ],
  },
  {
    title: "OTHER",
    items: [
      { href: "/plan", label: "我的档案", icon: "/profile.png" },
      { href: "/admin", label: "提醒规则", icon: "/announcement.png" },
    ],
  },
];

export function AppShell({
  children,
  userName = "同学",
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="app-root">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <span>督学数字人</span>
        </Link>

        {menu.map((group) => (
          <div key={group.title} className="menu-group">
            <div className="menu-title">{group.title}</div>
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={`${group.title}-${item.href}-${item.label}`}
                  href={item.href}
                  className={active ? "menu-link active" : "menu-link"}
                >
                  <Image src={item.icon} alt="" width={18} height={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="search-box">
            <Image src="/search.png" alt="" width={14} height={14} />
            <input placeholder="搜索任务、话术、计划模板…" />
          </div>
          <div className="top-actions">
            <button type="button" className="icon-btn" aria-label="消息">
              <Image src="/message.png" alt="" width={16} height={16} />
            </button>
            <button type="button" className="icon-btn" aria-label="公告">
              <Image src="/announcement.png" alt="" width={16} height={16} />
              <span className="badge-dot">3</span>
            </button>
            <div className="user-chip">
              <div className="meta">
                <b>{userName}</b>
                <span>考研学员</span>
              </div>
              <Image src="/avatar.png" alt="avatar" width={36} height={36} />
            </div>
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
