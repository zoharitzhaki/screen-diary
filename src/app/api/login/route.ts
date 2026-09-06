import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "wt_auth";

export async function POST(request: NextRequest) {
  const { passcode, from } = (await request.json()) as { passcode?: string; from?: string | null };
  const expected = process.env.APP_PASSCODE;

  if (!expected) {
    return NextResponse.json({ ok: true, redirect: from || "/" });
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: "קוד גישה שגוי" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, redirect: from || "/" });
  res.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
