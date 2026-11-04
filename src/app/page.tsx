"use client";

import Image from "next/image";
import Link from "next/link";
import { DigitalHumanPlayer } from "@/components/DigitalHumanPlayer";
import { useAppStore } from "@/hooks/useAppStore";

export default function HomePage() {
  const { store, ready, toggleTask } = useAppStore();

  if (!ready || !store) {
    return <div className="card">加载中…</div>;
  }

  const plan = store.plan;
  const done = plan?.tasks.filter((t) => t.done).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const minutes = plan?.tasks.reduce((sum, t) => sum + t.minutes, 0) ?? 0;
  const rate = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="stats-row">
        <div className="stat-card" style={{ background: "var(--lama-sky)" }}>
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">今日完成</div>
          <div className="value">
            {done}/{total}
          </div>
        </div>
        <div className="stat-card" style={{ background: "var(--lama-purple)" }}>
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">连续打卡</div>
          <div className="value">{plan?.streak ?? 0}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--lama-yellow)" }}>
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">计划分钟</div>
          <div className="value">{minutes}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--lama-sky-light)" }}>
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">完成率</div>
          <div className="value">{rate}%</div>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack">
          <section className="card">
            <div className="section-head">
              <h2>今日督学</h2>
              <Link href="/checkin" className="linkish">
                去打卡 →
              </Link>
            </div>
            <p className="lead">
              嗨 {store.userName}，按方案一推进：计划制定 → 执行监督 → 数字人播报陪伴。
              UI 套用开源高星模板{" "}
              <a
                href="https://github.com/safak/next-dashboard-ui"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "underline" }}
              >
                safak/next-dashboard-ui
              </a>
              （School Management Dashboard）。
            </p>
            <div className="row" style={{ marginTop: 14 }}>
              <Link className="btn" href="/checkin">
                提交打卡
              </Link>
              <Link className="btn ghost" href="/plan">
                调整计划
              </Link>
              <Link className="btn purple" href="/admin">
                配置话术
              </Link>
            </div>
          </section>

          <section className="card purpleLight">
            <div className="section-head">
              <h2>今日任务</h2>
              <span className="linkish">{plan?.name}</span>
            </div>
            <div className="task-list">
              {plan?.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={task.done ? "task-item done" : "task-item"}
                  onClick={() => toggleTask(task.id)}
                >
                  <div>
                    <b>{task.title}</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {task.subject} · {task.minutes} 分钟
                    </span>
                  </div>
                  <span className={task.done ? "pill ok" : "pill warn"}>
                    {task.done ? "已完成" : "待执行"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <DigitalHumanPlayer
            scripts={store.scripts}
            userName={store.userName}
            defaultScene="opening"
          />

          <section className="card">
            <div className="section-head">
              <h2>提醒公告</h2>
              <span className="linkish">Rules</span>
            </div>
            {store.rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`announce ${idx === 1 ? "purple" : idx === 2 ? "yellow" : ""}`}
              >
                <b>
                  {rule.time} · {rule.name}
                </b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {rule.enabled ? "已启用" : "已停用"} · {rule.note}
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
