"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/DemoToast";
import type { ReminderRule, ScriptItem, ScriptScene } from "@/lib/types";
import { useAppStore } from "@/hooks/useAppStore";

const scenes: { value: ScriptScene; label: string }[] = [
  { value: "opening", label: "开场" },
  { value: "reminder", label: "节点提醒" },
  { value: "review", label: "复盘" },
];

export default function AdminPage() {
  const { store, ready, saveScript, saveRule, updateSettings } = useAppStore();
  const { show } = useToast();
  const [scriptForm, setScriptForm] = useState<ScriptItem | null>(null);
  const [ruleForm, setRuleForm] = useState<ReminderRule | null>(null);
  const [tip, setTip] = useState("");
  const [examDate, setExamDate] = useState("2026-12-19");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsTime, setSmsTime] = useState("14:00");

  useEffect(() => {
    if (!store) return;
    setScriptForm(store.scripts[0] ?? null);
    setRuleForm(store.rules[0] ?? null);
    setExamDate(store.examDate || "2026-12-19");
    setSmsEnabled(!!store.smsReminderEnabled);
    setSmsTime(store.smsReminderTime || "14:00");
  }, [store]);

  if (!ready || !store || !scriptForm || !ruleForm) {
    return <div className="card">加载中…</div>;
  }

  return (
    <div className="grid-main">
      <section className="card">
        <div className="section-head">
          <h2>制定你的专属伴学</h2>
          <span className="linkish">陪伴文案</span>
        </div>
        <p className="lead">
          定制开场、节点提醒、复盘总结的专属陪伴话术，让督学更像为你准备的。
        </p>

        <div className="field" style={{ marginTop: 12 }}>
          <label>考研考试日</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label>短信催学（到点未打开网页，发到注册手机号）</label>
          <div className="row">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
              />
              开启短信催学
            </label>
            <input
              type="time"
              value={smsTime}
              onChange={(e) => setSmsTime(e.target.value)}
              style={{ maxWidth: 140 }}
            />
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
            按北京时间判断。未配置短信通道时，会先写入服务器 outbox，便于联调。
          </p>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn sky"
            onClick={() => {
              updateSettings({
                examDate,
                smsReminderEnabled: smsEnabled,
                smsReminderTime: smsTime,
              });
              setTip("考试日与短信催学已保存");
              show("考试日与短信催学已保存");
            }}
          >
            保存激励 / 短信设置
          </button>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>选择话术</label>
          <select
            value={scriptForm.id}
            onChange={(e) => {
              const found = store.scripts.find((s) => s.id === e.target.value);
              if (found) setScriptForm(found);
            }}
          >
            {store.scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>场景</label>
          <select
            value={scriptForm.scene}
            onChange={(e) =>
              setScriptForm({
                ...scriptForm,
                scene: e.target.value as ScriptScene,
              })
            }
          >
            {scenes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>标题</label>
          <input
            value={scriptForm.title}
            onChange={(e) =>
              setScriptForm({ ...scriptForm, title: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>话术内容</label>
          <textarea
            value={scriptForm.content}
            onChange={(e) =>
              setScriptForm({ ...scriptForm, content: e.target.value })
            }
          />
        </div>
        <button
          type="button"
          className="btn purple"
          onClick={() => {
            saveScript({
              ...scriptForm,
              updatedAt: new Date().toISOString().slice(0, 10),
            });
            setTip("伴学话术已保存");
            show("伴学话术已保存");
          }}
        >
          保存话术
        </button>
      </section>

      <section className="card yellowLight">
        <div className="section-head">
          <h2>提醒规则 / 模板</h2>
          <span className="linkish">配置</span>
        </div>

        <div className="field">
          <label>选择规则</label>
          <select
            value={ruleForm.id}
            onChange={(e) => {
              const found = store.rules.find((r) => r.id === e.target.value);
              if (found) setRuleForm(found);
            }}
          >
            {store.rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>规则名称</label>
          <input
            value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>提醒时间</label>
          <input
            type="time"
            value={ruleForm.time}
            onChange={(e) => setRuleForm({ ...ruleForm, time: e.target.value })}
          />
        </div>
        <div className="field">
          <label>播报场景</label>
          <select
            value={ruleForm.scene}
            onChange={(e) =>
              setRuleForm({
                ...ruleForm,
                scene: e.target.value as ScriptScene,
              })
            }
          >
            {scenes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>说明</label>
          <textarea
            value={ruleForm.note}
            onChange={(e) => setRuleForm({ ...ruleForm, note: e.target.value })}
          />
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              saveRule(ruleForm);
              setTip("规则已保存");
              show("规则已保存");
            }}
          >
            保存规则
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const next = { ...ruleForm, enabled: !ruleForm.enabled };
              setRuleForm(next);
              saveRule(next);
              const text = next.enabled ? "规则已启用" : "规则已停用";
              setTip(text);
              show(text);
            }}
          >
            {ruleForm.enabled ? "停用" : "启用"}
          </button>
        </div>

        {tip ? <p className="lead">{tip}</p> : null}

        <table className="table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>规则</th>
              <th>时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {store.rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.time}</td>
                <td>{r.enabled ? "启用" : "停用"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="section-head" style={{ marginTop: 20 }}>
          <h2>计划模板</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>模板</th>
              <th>科目</th>
              <th>时长</th>
            </tr>
          </thead>
          <tbody>
            {store.templates.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.subjects.join("、")}</td>
                <td>{t.dailyMinutes} 分钟</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
