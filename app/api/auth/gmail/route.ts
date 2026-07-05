import { NextRequest, NextResponse } from "next/server";

// Visiting this (as the euginemicah@gmail.com Google account, while logged in
// as admin) kicks off the one-time consent screen that authorizes this app
// to send email as that address. Protected by admin middleware - see
// middleware.ts PROTECTED_PREFIXES.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID not configured" }, { status: 500 });
  }
  const redirectUri = `${req.nextUrl.origin}/api/auth/gmail/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return NextResponse.redirect(url.toString());
}
