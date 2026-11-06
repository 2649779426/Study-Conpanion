import { NextResponse } from "next/server";
import { findUserByPhone, isValidPhone } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; password?: string };
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");

    if (!isValidPhone(phone) || !password) {
      return NextResponse.json(
        { error: "请输入手机号和密码" },
        { status: 400 },
      );
    }

    const user = findUserByPhone(phone);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "手机号或密码错误" },
        { status: 401 },
      );
    }

    const token = createSessionToken(user.id, user.phone);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, phone: user.phone },
    });
  } catch {
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
