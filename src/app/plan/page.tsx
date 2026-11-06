"use client";

import { useState } from "react";
import { StudyStats } from "@/components/StudyStats";
import { TaskMinutesEditor } from "@/components/TaskMinutesEditor";
import { useToast } from "@/components/DemoToast";
import { useAppStore } from "@/hooks/useAppStore";
import type { PlanTemplate } from "@/lib/types";

type TemplateForm = {
  id: string;
  name: string;
  examTarget: string;
  dailyMinutes: string;
  subjects: string;
  tasks: string;
};

function emptyForm(): TemplateForm {
  return {
    id: "",
    name: "",
    examTarget: "",
    dailyMinutes: "120",
    subjects: "英语, 政治, 专业课",
    tasks: "英语阅读 1 篇\n政治选择题一节\n专业课背诵",
  };
}

function toForm(tpl: PlanTemplate): TemplateForm {
  return {
    id: tpl.id,
    name: tpl.name,
    examTarget: tpl.examTarget,
    dailyMinutes: String(tpl.dailyMinutes),
    subjects: tpl.subjects.join("、"),
    tasks: tpl.tasks.join("\n"),
  };
}

function parseSubjects(raw: string) {
  return raw
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTasks(raw: string) {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildTemplate(form: TemplateForm): PlanTemplate | null {
  const name = form.name.trim();
  const examTarget = form.examTarget.trim();
  const subjects = parseSubjects(form.subjects);
  const tasks = parseTasks(form.tasks);
  const dailyMinutes = Math.max(
    30,
    Math.min(720, Math.round(Number(form.dailyMinutes)) || 120),
  );

  if (!name || !examTarget || subjects.length === 0 || tasks.length === 0) {
    return null;
  }

  return {
    id: form.id || `tpl-${Date.now()}`,
    name,
    examTarget,
    dailyMinutes,
    subjects,
    tasks,
  };
}

export default function PlanPage() {
  const {
    store,
    ready,
    chooseTemplate,
    setUserName,
    updateTaskMinutes,
    saveTemplate,
    removeTemplate,
  } = useAppStore();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<TemplateForm | null>(null);

  if (!ready || !store) {
    return <div className="card">加载中…</div>;
  }

  function handleSaveTemplate() {
    if (!editing) return;
    const tpl = buildTemplate(editing);
    if (!tpl) {
      show("请完整填写名称、目标、科目与任务");
      return;
    }
    saveTemplate(tpl);
    setEditing(null);
    show(editing.id ? "模板已更新" : "模板已添加");
  }

  return (
    <div className="grid-main">
      <section className="card">
        <div className="section-head">
          <h2>学习计划</h2>
          <span className="linkish">可自定义</span>
        </div>
        <p className="lead">
          选择模板生成今日任务，也可自行添加、编辑、删除模板。应用后仍可调整每项时长；打卡进度会触发动态调整（加练
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
          <button
            type="button"
            className="btn purple"
            onClick={() => setEditing(emptyForm())}
          >
            新建模板
          </button>
        </div>

        {editing ? (
          <div className="template-editor">
            <div className="section-head">
              <h3 style={{ margin: 0, fontSize: 15 }}>
                {editing.id ? "编辑模板" : "新建模板"}
              </h3>
              <button
                type="button"
                className="linkish"
                onClick={() => setEditing(null)}
              >
                取消
              </button>
            </div>

            <div className="field">
              <label>模板名称</label>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                placeholder="例如：数学冲刺周"
              />
            </div>
            <div className="field">
              <label>备考目标</label>
              <input
                value={editing.examTarget}
                onChange={(e) =>
                  setEditing({ ...editing, examTarget: e.target.value })
                }
                placeholder="例如：数学提分"
              />
            </div>
            <div className="field">
              <label>每日总时长（分钟）</label>
              <input
                type="number"
                min={30}
                max={720}
                value={editing.dailyMinutes}
                onChange={(e) =>
                  setEditing({ ...editing, dailyMinutes: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>科目（用顿号、逗号分隔）</label>
              <input
                value={editing.subjects}
                onChange={(e) =>
                  setEditing({ ...editing, subjects: e.target.value })
                }
                placeholder="英语、政治、专业课"
              />
            </div>
            <div className="field">
              <label>每日任务（每行一项）</label>
              <textarea
                value={editing.tasks}
                onChange={(e) =>
                  setEditing({ ...editing, tasks: e.target.value })
                }
                placeholder={"单词 100 个\n阅读理解 2 篇"}
              />
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={handleSaveTemplate}>
                保存模板
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditing(null)}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}

        <div className="stack" style={{ marginTop: editing ? 16 : 0 }}>
          {store.templates.length === 0 ? (
            <p className="muted">还没有模板，点击「新建模板」开始定制。</p>
          ) : (
            store.templates.map((tpl) => (
              <div key={tpl.id} className="template-card">
                <button
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
                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    {tpl.tasks.map((t, i) => (
                      <div key={`${tpl.id}-task-${i}`}>· {t}</div>
                    ))}
                  </div>
                </button>
                <div className="row template-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      chooseTemplate(tpl, name || store.userName);
                      show(`已应用模板：${tpl.name}`);
                    }}
                  >
                    应用
                  </button>
                  <button
                    type="button"
                    className="btn sky"
                    onClick={() => setEditing(toForm(tpl))}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      if (!window.confirm(`确定删除模板「${tpl.name}」？`)) {
                        return;
                      }
                      removeTemplate(tpl.id);
                      if (editing?.id === tpl.id) setEditing(null);
                      show("模板已删除");
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
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
