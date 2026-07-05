import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, getSessionSecret, UGT_SESSION_COOKIE } from "@/lib/ugt-admin-auth";

// Basic in-memory throttle - resets on redeploy/cold start, which is fine for
// a single-admin panel; the goal is just to stop trivial password guessing.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!checkAdminPassword(password)) {
    const next = entry && now < entry.resetAt ? { count: entry.count + 1, resetAt: entry.resetAt } : { count: 1, resetAt: now + WINDOW_MS };
    attempts.set(ip, next);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(UGT_SESSION_COOKIE, getSessionSecret(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
