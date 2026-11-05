"use client";

import type { AppStore } from "@/lib/types";
import {
  cumulativeMinutes,
  formatDuration,
  formatHoursShort,
  recentDailyMinutes,
  todayDoneMinutes,
  todayPlanMinutes,
} from "@/lib/stats";

export function StudyStats({ store }: { store: AppStore }) {
  const todayDone = todayDoneMinutes(store);
  const todayPlan = todayPlanMinutes(store);
  const total = cumulativeMinutes(store);
  const days = recentDailyMinutes(store, 7);
  const maxDay = Math.max(60, ...days.map((d) => d.minutes));
  const doneCount = store.plan?.tasks.filter((t) => t.done).length ?? 0;
  const taskTotal = store.plan?.tasks.length ?? 0;
  const taskRate = taskTotal ? Math.round((doneCount / taskTotal) * 100) : 0;
  const timeRate = todayPlan ? Math.min(100, Math.round((todayDone / todayPlan) * 100)) : 0;

  return (
    <section className="card skyLight">
      <div className="section-head">
        <h2>学习时长</h2>
        <span className="linkish">可视化</span>
      </div>

      <div className="stats-mini">
        <div className="stats-mini-item">
          <span className="muted">今日已学</span>
          <b>{formatHoursShort(todayDone)} 小时</b>
          <span className="muted" style={{ fontSize: 12 }}>
            {formatDuration(todayDone)} / 计划 {formatDuration(todayPlan)}
          </span>
        </div>
        <div className="stats-mini-item">
          <span className="muted">累计学习</span>
          <b>{formatHoursShort(total)} 小时</b>
          <span className="muted" style={{ fontSize: 12 }}>
            {formatDuration(total)}
          </span>
        </div>
        <div className="stats-mini-item">
          <span className="muted">今日任务</span>
          <b>
            {doneCount}/{taskTotal}
          </b>
          <span className="muted" style={{ fontSize: 12 }}>
            完成率 {taskRate}%
          </span>
        </div>
      </div>

      <div className="progress-block">
        <div className="progress-label">
          <span>今日时长进度</span>
          <span>{timeRate}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill sky" style={{ width: `${timeRate}%` }} />
        </div>
      </div>

      <div className="progress-block">
        <div className="progress-label">
          <span>今日任务进度</span>
          <span>{taskRate}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill purple" style={{ width: `${taskRate}%` }} />
        </div>
      </div>

      <div className="bar-chart" aria-label="近7日学习时长">
        {days.map((d) => (
          <div key={d.date} className="bar-col">
            <div className="bar-wrap">
              <div
                className="bar"
                style={{ height: `${Math.max(4, (d.minutes / maxDay) * 100)}%` }}
                title={`${d.label} · ${formatDuration(d.minutes)}`}
              />
            </div>
            <span>{d.label}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        近 7 日学习时长（按打卡与今日完成任务统计）
      </p>
    </section>
  );
}
