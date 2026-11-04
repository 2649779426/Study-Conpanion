"use client";

import { useState } from "react";
import { useAppStore } from "@/hooks/useAppStore";

export default function PlanPage() {
  const { store, ready, chooseTemplate, setUserName } = useAppStore();
  const [name, setName] = useState("");

  if (!ready || !store) {
    return <div className="panel">加载中…</div>;
  }

  return (
    <div className="grid-2">
      <section className="panel">
        <h1>学习计划</h1>
        <p className="lead">
          选择计划模板后生成今日任务。打卡进度会触发动态调整（加练 / 精简）。
        </p>

        <div className="field">
          <label>学员称呼</label>
          <input
            value={name || store.userName}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：小周"
          />
        </div>
        <div className="row" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="btn"
            onClick={() => setUserName(name || store.userName)}
          >
            保存称呼
          </button>
        </div>

        <h2>计划模板</h2>
        <div className="template-grid" style={{ marginTop: 12 }}>
          {store.templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => chooseTemplate(tpl, name || store.userName)}
            >
              <b>{tpl.name}</b>
              <div className="muted" style={{ marginTop: 6 }}>
                {tpl.examTarget} · 每日约 {tpl.dailyMinutes} 分钟
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {tpl.subjects.join(" / ")}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="list-card">
        <h2>当前计划</h2>
        {store.plan ? (
          <>
            <p className="meta">
              {store.plan.name} · {store.plan.examTarget}
            </p>
            <p className="muted">开始日期 {store.plan.startDate}</p>
            <div className="task-list" style={{ marginTop: 16 }}>
              {store.plan.tasks.map((task) => (
                <div key={task.id} className="task">
                  <div>
                    <b>{task.title}</b>
                    <span className="muted">
                      {task.subject} · {task.minutes} 分钟
                    </span>
                  </div>
                  <span className="badge">{task.done ? "完成" : "待办"}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">还没有计划，请先选择模板。</p>
        )}
      </section>
    </div>
  );
}
