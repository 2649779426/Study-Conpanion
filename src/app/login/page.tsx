"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { user, ready, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setPending(true);
    const err =
      mode === "login"
        ? await login(phone.trim(), password)
        : await register(phone.trim(), password);
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/");
  }

  if (!ready || user) {
    return <div className="auth-page"><div className="card">加载中…</div></div>;
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <div className="section-head">
          <h2>{mode === "login" ? "登录督学" : "注册账号"}</h2>
          <span className="linkish">手机号 + 密码</span>
        </div>
        <p className="lead">
          每人一个账号，学习计划、打卡与模板互不影响。无需短信，直接本地注册。
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={mode === "register" ? "btn purple" : "btn ghost"}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            注册
          </button>
          <button
            type="button"
            className={mode === "login" ? "btn" : "btn ghost"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            登录
          </button>
        </div>

        <div className="field">
          <label>手机号</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="11 位手机号"
            maxLength={11}
            required
          />
        </div>
        <div className="field">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="至少 6 位"
            minLength={6}
            required
          />
        </div>
        {mode === "register" ? (
          <div className="field">
            <label>确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="再输入一次"
              minLength={6}
              required
            />
          </div>
        ) : null}

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" className="btn" disabled={pending} style={{ width: "100%" }}>
          {pending ? "请稍候…" : mode === "login" ? "登录" : "注册并进入"}
        </button>
      </form>
    </div>
  );
}
