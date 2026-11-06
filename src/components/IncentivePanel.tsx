"use client";

import type { AppStore } from "@/lib/types";
import {
  examCountdownDays,
  milestoneBadges,
  persistenceRate,
} from "@/lib/stats";

export function IncentivePanel({ store }: { store: AppStore }) {
  const daysLeft = examCountdownDays(store.examDate || "2026-12-19");
  const streak = store.plan?.streak ?? 0;
  const weekRate = persistenceRate(store, 7);
  const monthRate = persistenceRate(store, 30);
  const badges = milestoneBadges(streak);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="card yellowLight">
      <div className="section-head">
        <h2>打卡激励</h2>
        <span className="linkish">
          已获 {earned}/{badges.length} 枚勋章
        </span>
      </div>
      <p className="lead">用倒计时和坚持数据给自己一点正向反馈。</p>

      <div className="incentive-grid">
        <div className="incentive-item">
          <span className="muted">考研倒计时</span>
          <b>{daysLeft}</b>
          <span className="muted" style={{ fontSize: 12 }}>
            天 · {store.examDate || "2026-12-19"}
          </span>
        </div>
        <div className="incentive-item">
          <span className="muted">连续打卡</span>
          <b>{streak}</b>
          <span className="muted" style={{ fontSize: 12 }}>
            天
          </span>
        </div>
        <div className="incentive-item">
          <span className="muted">周坚持率</span>
          <b>{weekRate}%</b>
          <span className="muted" style={{ fontSize: 12 }}>
            近 7 日有打卡占比
          </span>
        </div>
        <div className="incentive-item">
          <span className="muted">月坚持率</span>
          <b>{monthRate}%</b>
          <span className="muted" style={{ fontSize: 12 }}>
            近 30 日有打卡占比
          </span>
        </div>
      </div>

      <div className="badge-row" aria-label="里程碑勋章">
        {badges.map((badge) => (
          <div
            key={badge.days}
            className={badge.earned ? "milestone-badge on" : "milestone-badge"}
            title={
              badge.earned
                ? `已达成连续 ${badge.days} 天`
                : `连续打卡 ${badge.days} 天解锁`
            }
          >
            <span className="milestone-days">{badge.days}天</span>
            <span className="milestone-title">{badge.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
