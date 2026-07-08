import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/ugt-admin-auth";

// Urban Gang Tour's admin dashboard: only the data API is gated here.
// /admin itself renders a login form client-side when the API returns 401,
// so there's no redirect loop to manage.
//
// /api/ugt-admin/login is excluded since it's what issues the session
// cookie in the first place - it can't require one to be called.
const UGT_ADMIN_PROTECTED_PREFIXES = ["/api/ugt-admin", "/api/auth/gmail"];
const UGT_ADMIN_PUBLIC_EXCEPTIONS = ["/api/ugt-admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    UGT_ADMIN_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !UGT_ADMIN_PUBLIC_EXCEPTIONS.some((p) => pathname.startsWith(p))
  ) {
    if (isAdminAuthenticated(req)) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

