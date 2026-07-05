import { NextRequest, NextResponse } from "next/server";

// Exchanges the one-time authorization code for a refresh token and shows it
// ONCE so it can be saved as GOOGLE_GMAIL_REFRESH_TOKEN. Deliberately does not
// persist anything itself - a refresh token is a long-lived credential and
// should be set once via `vercel env add` / the dashboard, not stored by a
// route that could be hit again.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }
  const redirectUri = `${req.nextUrl.origin}/api/auth/gmail/callback`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.error_description || data.error || "Token exchange failed" }, { status: 502 });
  }
  if (!data.refresh_token) {
    return new NextResponse(
      "<p>Google didn't return a refresh token - it only issues one the first time an app is authorized. " +
        'Revoke this app\'s access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.</p>',
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<div style="font-family:sans-serif;max-width:600px;margin:40px auto">
       <h2>Gmail authorized</h2>
       <p>Copy this value and save it as the <code>GOOGLE_GMAIL_REFRESH_TOKEN</code> environment variable, then reload this tab to confirm it's gone from here:</p>
       <textarea style="width:100%;height:80px">${data.refresh_token}</textarea>
       <p>This is shown once. Once it's saved as an env var, order confirmation and sale-notification emails will start sending automatically.</p>
     </div>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
