import { NextResponse } from "next/server";
import {
  createUser,
  isValidPassword,
  isValidPhone,
} from "@/lib/auth/db";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { phone?: string; password?: string };
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "请输入正确的 11 位手机号" },
        { status: 400 },
      );
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "密码需为 6–64 位" },
        { status: 400 },
      );
    }

    const user = createUser(phone, hashPassword(password));
    const token = createSessionToken(user.id, user.phone);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, phone: user.phone },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PHONE_EXISTS") {
      return NextResponse.json(
        { error: "该手机号已注册，请直接登录" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
