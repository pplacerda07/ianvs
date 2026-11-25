import { NextResponse } from "next/server";
import { AUTH_COOKIE, adminToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && password !== pw) return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  if (pw)
    res.cookies.set(AUTH_COOKIE, await adminToken(pw), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
