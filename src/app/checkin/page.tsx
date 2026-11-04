"use client";

import { useState } from "react";
import { DigitalHumanPlayer } from "@/components/DigitalHumanPlayer";
import { useAppStore } from "@/hooks/useAppStore";

export default function CheckInPage() {
  const { store, ready, toggleTask, checkIn } = useAppStore();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  if (!ready || !store) {
    return <div className="panel">加载中…</div>;
  }

  const done = store.plan?.tasks.filter((t) => t.done).length ?? 0;
  const total = store.plan?.tasks.length ?? 0;

  return (
    <div className="grid-2">
      <section className="panel">
        <h1>进度打卡</h1>
        <p className="lead">
          勾选已完成任务并提交打卡。系统会依据完成率动态调整后续任务强度。
        </p>

        <div className="task-list">
          {store.plan?.tasks.map((task) => (
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
              <span className="badge">{task.done ? "已完成" : "点击完成"}</span>
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 18 }}>
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
            className="btn primary"
            onClick={() => {
              checkIn(note.trim() || `完成 ${done}/${total}`);
              setMessage(
                done / Math.max(total, 1) >= 0.75
                  ? "完成度高，已自动加练未完成项。"
                  : done / Math.max(total, 1) < 0.4 && done > 0
                    ? "完成度偏低，已自动精简未完成项。"
                    : "打卡已记录。",
              );
              setNote("");
            }}
          >
            提交打卡（{done}/{total}）
          </button>
        </div>
        {message ? <p className="meta" style={{ marginTop: 12 }}>{message}</p> : null}

        <h2 style={{ marginTop: 28 }}>最近打卡</h2>
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

      <DigitalHumanPlayer
        scripts={store.scripts}
        userName={store.userName}
        defaultScene="review"
      />
    </div>
  );
}
