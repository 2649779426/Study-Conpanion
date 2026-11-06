import { NextResponse } from "next/server";
import { findUserById } from "@/lib/auth/db";
import { readSession } from "@/lib/auth/session";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: { id: user.id, phone: user.phone },
  });
}
