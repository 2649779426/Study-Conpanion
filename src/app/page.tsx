"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DigitalHumanPlayer } from "@/components/DigitalHumanPlayer";
import { IncentivePanel } from "@/components/IncentivePanel";
import { StudyStats } from "@/components/StudyStats";
import { TaskMinutesEditor } from "@/components/TaskMinutesEditor";
import { useToast } from "@/components/DemoToast";
import { useAppStore } from "@/hooks/useAppStore";
import { formatHoursShort, todayDoneMinutes } from "@/lib/stats";

export default function HomePage() {
  const { store, ready, toggleTask, updateTaskMinutes } = useAppStore();
  const router = useRouter();
  const { show } = useToast();

  if (!ready || !store) {
    return <div className="card">加载中…</div>;
  }

  const plan = store.plan;
  const done = plan?.tasks.filter((t) => t.done).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const minutes = plan?.tasks.reduce((sum, t) => sum + t.minutes, 0) ?? 0;
  const todayDone = todayDoneMinutes(store);
  const rate = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="stats-row" aria-label="今日学习概览">
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-sky)" }}
          onClick={() => {
            router.push("/checkin");
            show("进入进度打卡");
          }}
        >
          <span className="stat-kicker">打卡</span>
          <div>
            <div className="label">今日完成</div>
            <div className="value">
              {done}/{total}
            </div>
            <div className="stat-sub">完成率 {rate}%</div>
          </div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-purple)" }}
          onClick={() => {
            show(`连续打卡 ${plan?.streak ?? 0} 天，继续保持`);
          }}
        >
          <span className="stat-kicker">坚持</span>
          <div>
            <div className="label">连续打卡</div>
            <div className="value">{plan?.streak ?? 0}</div>
            <div className="stat-sub">天</div>
          </div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-yellow)" }}
          onClick={() => {
            router.push("/plan");
            show("进入学习计划，可滑动调整时长");
          }}
        >
          <span className="stat-kicker">计划</span>
          <div>
            <div className="label">计划时长</div>
            <div className="value">{formatHoursShort(minutes)}</div>
            <div className="stat-sub">小时 · 去调整任务</div>
          </div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-sky-light)" }}
          onClick={() => {
            show(`今日已学 ${formatHoursShort(todayDone)} 小时`);
          }}
        >
          <span className="stat-kicker">进度</span>
          <div>
            <div className="label">今日已学</div>
            <div className="value">{formatHoursShort(todayDone)}</div>
            <div className="stat-sub">小时</div>
          </div>
        </button>
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
              嗨 {store.userName}，督学助手已在线陪伴。进入页面会主动开场，学习中会提醒进度，打卡后会陪你复盘。
            </p>
            <div className="row" style={{ marginTop: 14 }}>
              <Link className="btn" href="/checkin">
                提交打卡
              </Link>
              <Link className="btn ghost" href="/plan">
                调整计划
              </Link>
              <Link className="btn purple" href="/admin">
                制定你的专属伴学
              </Link>
            </div>
          </section>

          <IncentivePanel store={store} />

          <StudyStats store={store} />

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
            autoPlay
            remindIfPending
            pendingCount={Math.max(total - done, 0)}
            companion
          />

          <section className="card">
            <div className="section-head">
              <h2>提醒公告</h2>
              <Link href="/admin" className="linkish">
                去配置 →
              </Link>
            </div>
            {store.rules.map((rule, idx) => (
              <button
                key={rule.id}
                type="button"
                className={`announce ${idx === 1 ? "purple" : idx === 2 ? "yellow" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  cursor: "pointer",
                  display: "block",
                }}
                onClick={() => {
                  router.push("/admin");
                  show(`编辑规则：${rule.name}`);
                }}
              >
                <b>
                  {rule.time} · {rule.name}
                </b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {rule.enabled ? "已启用" : "已停用"} · {rule.note}
                </span>
              </button>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
