import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";
import { isAdminAuthenticated } from "@/lib/ugt-admin-auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/automate",
  "/api/automate-secret",
  "/api/mpesa/callback", // Safaricom's webhook - no session, must stay reachable
  "/api/orders", // order creation + status polling, used from public checkout UI
  "/api/catalog", // read-only prices/items shown on Shop and Events pages
  "/checkout.js",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

const PROTECTED_PREFIXES = [
  "/cockpit",
  "/api/cockpit",
  "/api/admin",
  "/api/post-carousel",
  "/api/post-from-url",
  "/api/post-from-url-proxy",
  "/api/post-log",
  "/api/post-video",
  "/api/retry-post",
  "/api/post-from-url-proxy",
];

// Urban Gang Tour's admin dashboard - separate cookie/session from the
// legacy /cockpit auth above (see lib/ugt-admin-auth.ts). Only the data API
// is gated; /admin itself renders a login form client-side when the API
// returns 401, so there's no redirect loop to manage here.
//
// Checked BEFORE PUBLIC_PATHS below: /api/auth/gmail would otherwise match
// the generic "/api/auth" public prefix and skip the password check
// entirely. /api/ugt-admin/login is excluded here since it's what issues
// the session cookie in the first place - it can't require one to be called.
const UGT_ADMIN_PROTECTED_PREFIXES = ["/api/ugt-admin", "/api/auth/gmail"];
const UGT_ADMIN_PUBLIC_EXCEPTIONS = ["/api/ugt-admin/login"];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (
    UGT_ADMIN_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !UGT_ADMIN_PUBLIC_EXCEPTIONS.some((p) => pathname.startsWith(p))
  ) {
    if (isAdminAuthenticated(req)) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow static assets and explicitly public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Only guard cockpit/admin surfaces; leave marketing pages public
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (session === SESSION_VALUE) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("redirect", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

