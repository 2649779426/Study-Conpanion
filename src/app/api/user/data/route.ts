import { NextResponse } from "next/server";
import { findUserById, readUserStore, writeUserStore } from "@/lib/auth/db";
import { readSession } from "@/lib/auth/session";
import type { AppStore } from "@/lib/types";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({ store: readUserStore(user.id) });
}

export async function PUT(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { store?: AppStore };
    if (!body.store || typeof body.store !== "object") {
      return NextResponse.json({ error: "数据格式错误" }, { status: 400 });
    }
    writeUserStore(user.id, body.store);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
