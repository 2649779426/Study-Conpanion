"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScheduledPlayer } from "@/components/ScheduledPlayer";
import { useToast } from "@/components/DemoToast";
import { useAppStore } from "@/hooks/useAppStore";
import { StudyTaskItem } from "@/components/StudyTaskItem";

export default function HomePage() {
  const { store, ready } = useAppStore();
  const router = useRouter();
  const { show } = useToast();

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
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-sky)" }}
          onClick={() => {
            router.push("/checkin");
            show("查看今日完成进度");
          }}
        >
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">今日完成</div>
          <div className="value">
            {done}/{total}
          </div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-purple)" }}
          onClick={() => {
            router.push("/checkin");
            show(`连续打卡 ${plan?.streak ?? 0} 天`);
          }}
        >
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">连续打卡</div>
          <div className="value">{plan?.streak ?? 0}</div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-yellow)" }}
          onClick={() => {
            router.push("/plan");
            show("查看学习计划时长");
          }}
        >
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">计划分钟</div>
          <div className="value">{minutes}</div>
        </button>
        <button
          type="button"
          className="stat-card"
          style={{ background: "var(--lama-sky-light)" }}
          onClick={() => {
            router.push("/checkin");
            show(`当前完成率 ${rate}%`);
          }}
        >
          <Image className="more" src="/more.png" alt="" width={16} height={16} />
          <div className="label">完成率</div>
          <div className="value">{rate}%</div>
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
              嗨 {store.userName}，进入页面会尝试开场播报，学习提醒按北京时间规则触发，打卡后可听复盘。浏览器限制自动出声时，请点击播放。
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
                <StudyTaskItem key={task.id} task={task} />
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <ScheduledPlayer
            defaultScene="opening"
            autoPlay
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
