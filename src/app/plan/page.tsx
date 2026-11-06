"use client";

import { useState } from "react";
import { StudyStats } from "@/components/StudyStats";
import { TaskMinutesEditor } from "@/components/TaskMinutesEditor";
import { useToast } from "@/components/DemoToast";
import { useAppStore } from "@/hooks/useAppStore";

export default function PlanPage() {
  const { store, ready, chooseTemplate, setUserName, updateTaskMinutes } =
    useAppStore();
  const { show } = useToast();
  const [name, setName] = useState("");

  if (!ready || !store) {
    return <div className="card">加载中…</div>;
  }

  return (
    <div className="grid-main">
      <section className="card">
        <div className="section-head">
          <h2>学习计划</h2>
          <span className="linkish">可选方案</span>
        </div>
        <p className="lead">
          选择计划模板生成今日任务。可手动调整每项时长，打卡进度会触发动态调整（加练
          / 精简）。
        </p>

        <div className="field" style={{ marginTop: 14 }}>
          <label>学员称呼</label>
          <input
            value={name || store.userName}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：小周"
          />
        </div>
        <div className="row" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setUserName(name || store.userName);
              show("称呼已保存");
            }}
          >
            保存称呼
          </button>
        </div>

        <div className="stack">
          {store.templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="template-btn"
              onClick={() => {
                chooseTemplate(tpl, name || store.userName);
                show(`已应用模板：${tpl.name}`);
              }}
            >
              <b>{tpl.name}</b>
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {tpl.examTarget} · 每日约 {tpl.dailyMinutes} 分钟 ·{" "}
                {tpl.subjects.join(" / ")}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="stack">
        <StudyStats store={store} />

        <section className="card purpleLight">
          <div className="section-head">
            <h2>当前计划</h2>
            <span className="linkish">{store.plan?.startDate}</span>
          </div>
          {store.plan ? (
            <>
              <p className="lead">
                {store.plan.name} · {store.plan.examTarget}
              </p>
              <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
                左右滑动即可调整每项任务时长（5–480 分钟），下方会即时显示分钟数
              </p>
              <div className="task-list" style={{ marginTop: 14 }}>
                {store.plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="task-item"
                    style={{ cursor: "default" }}
                  >
                    <div>
                      <b>{task.title}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {task.subject}
                      </span>
                      <TaskMinutesEditor
                        minutes={task.minutes}
                        onChange={(m) => updateTaskMinutes(task.id, m)}
                      />
                    </div>
                    <span className={task.done ? "pill ok" : "pill"}>
                      {task.done ? "完成" : "待办"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">还没有计划，请先选择模板。</p>
          )}
        </section>
      </div>
    </div>
  );
}
