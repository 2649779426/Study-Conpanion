"use client";

import Link from "next/link";
import { DigitalHumanPlayer } from "@/components/DigitalHumanPlayer";
import { useAppStore } from "@/hooks/useAppStore";

export default function HomePage() {
  const { store, ready, toggleTask } = useAppStore();

  if (!ready || !store) {
    return <div className="panel">加载中…</div>;
  }

  const plan = store.plan;
  const done = plan?.tasks.filter((t) => t.done).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const minutes = plan?.tasks.reduce((sum, t) => sum + t.minutes, 0) ?? 0;

  return (
    <div className="hero">
      <div>
        <section className="panel">
          <h1>今日督学</h1>
          <p className="lead">
            {store.userName}，按方案一完成「计划制定 → 执行监督 → 数字人播报陪伴」。
            比赛 Demo 使用浏览器语音播报，关键节点可替换为预生成数字人视频。
          </p>
          <div className="stats">
            <div className="stat">
              <b>{done}/{total}</b>
              <span>今日完成</span>
            </div>
            <div className="stat">
              <b>{plan?.streak ?? 0}</b>
              <span>连续打卡天</span>
            </div>
            <div className="stat">
              <b>{minutes}</b>
              <span>计划分钟</span>
            </div>
          </div>
          <div className="row">
            <Link className="btn primary" href="/checkin">
              去打卡
            </Link>
            <Link className="btn" href="/plan">
              调整计划
            </Link>
            <Link className="btn" href="/admin">
              后台话术
            </Link>
          </div>
        </section>

        <section className="list-card" style={{ marginTop: 16 }}>
          <h2>今日任务</h2>
          <p className="meta">勾选完成后可打卡；系统会按进度动态加练或精简。</p>
          <div className="task-list" style={{ marginTop: 14 }}>
            {plan?.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={task.done ? "task done" : "task"}
                onClick={() => toggleTask(task.id)}
              >
                <div>
                  <b>{task.title}</b>
                  <span className="muted">
                    {task.subject} · {task.minutes} 分钟
                  </span>
                </div>
                <span className="badge">{task.done ? "已完成" : "待执行"}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <DigitalHumanPlayer
        scripts={store.scripts}
        userName={store.userName}
        defaultScene="opening"
      />
    </div>
  );
}
