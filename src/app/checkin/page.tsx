"use client";

import { useState } from "react";
import { DigitalHumanPlayer } from "@/components/DigitalHumanPlayer";
import { StudyStats } from "@/components/StudyStats";
import { TaskMinutesEditor } from "@/components/TaskMinutesEditor";
import { useToast } from "@/components/DemoToast";
import { useAppStore } from "@/hooks/useAppStore";
import type { ScriptScene } from "@/lib/types";

export default function CheckInPage() {
  const { store, ready, toggleTask, checkIn, updateTaskMinutes } = useAppStore();
  const { show } = useToast();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [playSignal, setPlaySignal] = useState<{
    scene: ScriptScene;
    token: number;
  } | null>(null);

  if (!ready || !store) {
    return <div className="card">加载中…</div>;
  }

  const done = store.plan?.tasks.filter((t) => t.done).length ?? 0;
  const total = store.plan?.tasks.length ?? 0;

  return (
    <div className="grid-main">
      <section className="card">
        <div className="section-head">
          <h2>进度打卡</h2>
          <span className="linkish">
            {done}/{total}
          </span>
        </div>
        <p className="lead">
          勾选已完成任务并提交。可先调整任务时长，再打卡；系统会依据完成率动态调整后续任务强度。
        </p>

        <div className="task-list" style={{ marginTop: 14 }}>
          {store.plan?.tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={task.done ? "task-item done" : "task-item"}
              onClick={() => {
                toggleTask(task.id);
                show(task.done ? `取消完成：${task.title}` : `已完成：${task.title}`);
              }}
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
              <span className={task.done ? "pill ok" : "pill warn"}>
                {task.done ? "已完成" : "点击完成"}
              </span>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>打卡备注</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今天状态如何？卡在哪一科？"
          />
        </div>

        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              checkIn(note.trim() || `完成 ${done}/${total}`);
              const ratio = done / Math.max(total, 1);
              const tip =
                ratio >= 0.75
                  ? "完成度高，已自动加练未完成项。督学助手来陪你复盘。"
                  : ratio < 0.4 && done > 0
                    ? "完成度偏低，已自动精简未完成项。督学助手来陪你复盘。"
                    : "打卡已记录。督学助手来陪你复盘。";
              setMessage(tip);
              show(tip);
              setNote("");
              setPlaySignal({ scene: "review", token: Date.now() });
            }}
          >
            提交打卡
          </button>
        </div>
        {message ? (
          <p className="lead" style={{ marginTop: 10 }}>
            {message}
          </p>
        ) : null}

        <div className="section-head" style={{ marginTop: 24 }}>
          <h2>最近打卡</h2>
        </div>
        {store.checkIns.length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>完成数</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {store.checkIns.slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.taskIds.length}</td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="stack">
        <StudyStats store={store} />
        <DigitalHumanPlayer
          scripts={store.scripts}
          userName={store.userName}
          defaultScene="review"
          autoPlay={false}
          playSignal={playSignal}
          companion
        />
      </div>
    </div>
  );
}
