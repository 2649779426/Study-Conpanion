"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/hooks/useAppStore";
import { useStudyNow } from "@/hooks/useStudyNow";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { aggregateDays, durationText, reviewTimeline, reviewTotals, subjectShares, weeklySummary } from "@/lib/review";
import { focusRecordsAt } from "@/lib/focus";
import { speakText } from "@/lib/tts";

export default function ReviewPage() {
  const { store, ready } = useAppStore();
  const clock = useStudyNow(!!store?.focus);
  const [selected, setSelected] = useState<string | null>(null);
  const [speech, setSpeech] = useState("");
  const stopSpeech = useRef<(() => void) | null>(null);
  useEffect(() => () => stopSpeech.current?.(), []);
  if (!ready || !store) return <div className="card">加载中…</div>;
  const now = store.focus ? Math.max(clock, store.focus.startedAt) : clock;
  const totals = reviewTotals(store, now);
  const days = aggregateDays(store, 14, undefined, now);
  const shares = subjectShares(store, focusRecordsAt(store, now));
  const timeline = reviewTimeline(store, now);
  const summary = weeklySummary(store, now);
  const currentDay = days.find(d => d.date === selected) ?? days[days.length - 1];
  const maxSeconds = Math.max(60, ...days.map(d => d.seconds));
  const stats = [
    ["累计专注时长", durationText(totals.seconds), "var(--lama-sky)"],
    ["累计打卡天数", `${totals.checkInDays} 天`, "var(--lama-purple)"],
    ["当前连续天数", `${totals.streak} 天`, "var(--lama-yellow)"],
    ["累计完成任务数", `${totals.completedTasks} 项`, "var(--lama-sky-light)"],
  ];
  return <>
    <div className="section-head"><div><h1 className="review-title">学习成果</h1><p className="muted">把每一次专注，积累成看得见的进步。</p></div><Link className="btn ghost" href="/checkin">继续学习 →</Link></div>
    <SampleDataBanner />
    <div className="stats-row review-stats">
      {stats.map(([label, value, color]) => <div className="stat-card" key={label} style={{ background: color }}><div className="label">{label}</div><div className="value">{value}</div></div>)}
    </div>
    <p className="muted review-caption">连续天数仅计当天全部完成的打卡；完成数按每日提交记录累计。专注时长按秒累计，分钟向下取整。{store.focus ? "当前正在专注，时长实时更新。" : ""}</p>
    {timeline.length === 0 ? <section className="card review-empty"><h2>你的第一份学习成果，从此刻开始</h2><p className="muted">在今日任务点击「开始专注」，完成后暂停或结束，再提交打卡。这里会留下时长、任务与每天的回顾。</p><Link className="btn purple" href="/">去开始专注</Link></section> : null}
    <div className="grid-main review-grid">
      <section className="card">
        <div className="section-head"><h2>近 14 天专注时长</h2><span className="muted">北京时间 · 分钟</span></div>
        <p className="review-chart-detail" aria-live="polite">{currentDay.date} · 专注 {currentDay.minutes} 分钟 · {currentDay.completionKnown ? `完成率 ${currentDay.rate}%` : currentDay.checkedIn ? "旧记录未保存完成率" : "未打卡，完成率暂无"}</p>
        <div className="review-chart-scroll"><div className="review-chart" aria-label="近十四天每日专注时长，点击或悬停查看详情">
          {days.map(day => <button type="button" key={day.date} className={`review-day ${day.date === currentDay.date ? "selected" : ""}`}
            aria-pressed={day.date === currentDay.date} aria-label={`${day.date} 专注 ${day.minutes} 分钟，${day.completionKnown ? `完成率 ${day.rate}%` : "暂无完成率"}`}
            onMouseEnter={() => setSelected(day.date)} onFocus={() => setSelected(day.date)} onClick={() => setSelected(day.date)}>
            <span>{day.minutes}</span><span className="review-bar-track"><span style={{ height: day.seconds ? `${Math.max(2, day.seconds / maxSeconds * 100)}%` : "0%" }} /></span><span>{day.date.slice(5)}</span>
          </button>)}
        </div></div>
        {days.every(d => d.seconds === 0) ? <p className="muted">近 14 天暂无专注记录，开始一次计时就能看到变化。</p> : null}
      </section>
      <section className="card">
        <div className="section-head"><h2>各科专注占比</h2><span className="muted">累计时长</span></div>
        {shares.length ? <div className="subject-shares">{shares.map((item, index) => <div key={item.subject}>
          <div className="section-head"><b>{item.subject}</b><span className="muted">{item.minutes} 分钟 · {item.percent}%</span></div>
          <svg className="subject-bar" viewBox="0 0 400 12" preserveAspectRatio="none" role="img" aria-label={`${item.subject} ${item.minutes} 分钟，占 ${item.percent}%`}>
            <rect width="400" height="12" rx="6" fill="var(--lama-purple-light)" />
            <rect width={item.percent * 4} height="12" rx="6" fill={["#8b5cf6", "#38bdf8", "#eab308", "#34d399"][index % 4]} />
          </svg>
        </div>)}</div> : <p className="muted">暂无各科专注时长。计时会自动归入任务所属科目。</p>}
      </section>
    </div>
    <section className="card weekly-card purpleLight">
      <div className="section-head"><h2>本周小结</h2><span className="pill">来源：浏览器语音合成</span></div>
      <p className="lead">{summary}</p>
      <p className="muted review-caption">统计口径：本周一至今天，对比完整上周；未完成科目来自已提交打卡的任务快照。{timeline.some(d => d.sample) ? "小结包含醒目标注的示例记录。" : ""}</p>
      <div className="row"><button type="button" className="btn purple" onClick={() => {
        stopSpeech.current?.(); setSpeech("正在朗读本周小结…");
        stopSpeech.current = speakText(summary, () => setSpeech("朗读结束"), reason => setSpeech(`朗读不可用：${reason}`));
      }}>让督学助手读给我听</button>
        {speech === "正在朗读本周小结…" ? <button type="button" className="btn ghost" onClick={() => { stopSpeech.current?.(); setSpeech("已停止朗读"); }}>停止朗读</button> : null}
        <span role="status" className="muted">{speech}</span>
      </div>
    </section>
    <section className="card">
      <div className="section-head"><h2>学习回顾</h2><span className="muted">最近在前 · 点击日期展开</span></div>
      {timeline.length === 0 ? <p className="muted">还没有回顾记录。专注或打卡后，来这里看看自己的积累。</p> : <div className="review-timeline">{timeline.map((day, index) => <details key={day.date} open={index === 0}>
        <summary><b>{day.date}</b><span>专注 {Math.floor(day.seconds / 60)} 分钟 · {day.checkIn ? `完成 ${day.checkIn.taskIds.length}/${day.checkIn.totalTasks} 项` : "尚未打卡"}</span>{day.sample ? <strong className="pill warn">示例</strong> : null}</summary>
        <div className="timeline-body">
          {day.checkIn?.tasks ? <ul className="review-task-list">{day.checkIn.tasks.map(task => <li key={task.id}><span className={day.checkIn!.taskIds.includes(task.id) ? "pill ok" : "pill warn"}>{day.checkIn!.taskIds.includes(task.id) ? "已完成" : "未完成"}</span><span>{task.title} · {task.subject} · 计划 {task.minutes} 分钟</span></li>)}</ul>
            : day.checkIn ? <p className="muted">旧版打卡未保存任务标题，已完成任务编号：{day.checkIn.taskIds.join("、") || "无"}。</p> : null}
          {day.sessions.length ? <div className="muted">当天专注：{[...new Set(day.sessions.map(r => r.taskId))].map(id => { const sessions = day.sessions.filter(r => r.taskId === id); return <p key={id}>{sessions[0].taskTitle ?? sessions[0].subject} · {Math.floor(sessions.reduce((n, r) => n + r.seconds, 0) / 60)} 分钟</p>; })}</div> : <p className="muted">当天暂无计时记录，未用计划时长代替实际时长。</p>}
          {day.checkIn ? <><p>打卡备注：{day.checkIn.note || "未填写"}</p><p className="muted">当天计划：{day.checkIn.plannedMinutes === undefined ? "旧版记录未保存" : `${day.checkIn.plannedMinutes} 分钟`}</p>
            {day.checkIn.adjustments?.length ? <div><b>当天计划调整</b>{day.checkIn.adjustments.map(a => <p key={a.taskId}>{a.mode} · {a.title}：{a.before} → {a.after} 分钟</p>)}</div> : <p className="muted">当天未记录加练或精简调整。</p>}</> : <p className="muted">这一天有专注记录，还没有提交打卡。</p>}
        </div>
      </details>)}</div>}
    </section>
  </>;
}
