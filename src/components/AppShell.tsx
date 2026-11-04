"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppStore } from "@/components/StoreProvider";
import { useToast } from "@/components/DemoToast";

const menu = [
  {
    title: "功能",
    items: [
      { href: "/", label: "今日督学", icon: "/home.png" },
      { href: "/plan", label: "学习计划", icon: "/lesson.png" },
      { href: "/checkin", label: "进度打卡", icon: "/attendance.png" },
      { href: "/admin", label: "后台配置", icon: "/setting.png" },
    ],
  },
  {
    title: "更多",
    items: [
      { href: "/plan", label: "我的档案", icon: "/profile.png" },
      { href: "/admin", label: "提醒规则", icon: "/announcement.png" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, ready } = useAppStore();
  const { show } = useToast();
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"message" | "notice" | null>(null);

  const userName = ready && store ? store.userName : "同学";

  const searchHits = useMemo(() => {
    if (!store || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const hits: { label: string; href: string }[] = [];

    store.plan?.tasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) {
        hits.push({ label: `任务：${t.title}`, href: "/checkin" });
      }
    });
    store.scripts.forEach((s) => {
      if (s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)) {
        hits.push({ label: `话术：${s.title}`, href: "/admin" });
      }
    });
    store.templates.forEach((t) => {
      if (t.name.toLowerCase().includes(q)) {
        hits.push({ label: `模板：${t.name}`, href: "/plan" });
      }
    });
    return hits.slice(0, 6);
  }, [store, query]);

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
          <div className="search-wrap">
            <div className="search-box">
              <Image src="/search.png" alt="" width={14} height={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchHits[0]) {
                    router.push(searchHits[0].href);
                    show(`已跳转：${searchHits[0].label}`);
                    setQuery("");
                  }
                }}
                placeholder="搜索任务、话术、计划模板… 回车跳转"
              />
            </div>
            {query.trim() ? (
              <div className="search-dropdown">
                {searchHits.length === 0 ? (
                  <div className="search-empty">没有匹配结果</div>
                ) : (
                  searchHits.map((hit) => (
                    <button
                      key={hit.label}
                      type="button"
                      className="search-item"
                      onClick={() => {
                        router.push(hit.href);
                        show(`已跳转：${hit.label}`);
                        setQuery("");
                      }}
                    >
                      {hit.label}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="消息"
              onClick={() => setPanel(panel === "message" ? null : "message")}
            >
              <Image src="/message.png" alt="" width={16} height={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="公告"
              onClick={() => setPanel(panel === "notice" ? null : "notice")}
            >
              <Image src="/announcement.png" alt="" width={16} height={16} />
              <span className="badge-dot">3</span>
            </button>
            <button
              type="button"
              className="user-chip"
              onClick={() => {
                router.push("/plan");
                show("进入学习计划 / 我的档案");
              }}
            >
              <div className="meta">
                <b>{userName}</b>
                <span>考研学员</span>
              </div>
              <Image src="/avatar.png" alt="avatar" width={36} height={36} />
            </button>
          </div>
        </header>

        {panel ? (
          <div className="demo-panel">
            <div className="section-head">
              <h2>{panel === "message" ? "督学消息" : "提醒公告"}</h2>
              <button
                type="button"
                className="linkish"
                onClick={() => setPanel(null)}
              >
                关闭
              </button>
            </div>
            {panel === "message" ? (
              <>
                <div className="announce">
                  <b>今日开场提醒已准备好</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    可以开始今日学习播报
                  </span>
                </div>
                <div className="announce purple">
                  <b>还有任务未完成</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    完成后请及时打卡
                  </span>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn sky"
                    onClick={() => {
                      setPanel(null);
                      router.push("/");
                    }}
                  >
                    去播报
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setPanel(null);
                      router.push("/checkin");
                    }}
                  >
                    去打卡
                  </button>
                </div>
              </>
            ) : (
              <>
                {(store?.rules ?? []).map((rule, idx) => (
                  <button
                    key={rule.id}
                    type="button"
                    className={`announce ${idx === 1 ? "purple" : idx === 2 ? "yellow" : ""}`}
                    style={{ width: "100%", textAlign: "left", border: 0, cursor: "pointer" }}
                    onClick={() => {
                      setPanel(null);
                      router.push("/admin");
                      show(`查看规则：${rule.name}`);
                    }}
                  >
                    <b>
                      {rule.time} · {rule.name}
                    </b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {rule.note}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
