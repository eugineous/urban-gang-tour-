// ads.txt - the file Google AdSense requires at the site root to confirm you
// authorize Google to sell ads on this domain. Served dynamically from the
// publisher id so there is no hardcoded id to keep in sync: set
// NEXT_PUBLIC_ADSENSE_CLIENT (e.g. ca-pub-1234567890123456) in Vercel and
// this file publishes itself. Until then it 404s, which is correct: an empty
// or wrong ads.txt is worse than none.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';
  // ca-pub-XXXX -> pub-XXXX (ads.txt uses the pub- form without the "ca-")
  const pub = client.replace(/^ca-/, '').trim();
  if (!/^pub-\d{10,20}$/.test(pub)) {
    return new Response('ads.txt not configured', { status: 404 });
  }
  // f08c47fec0942fa0 is Google's fixed certification authority id for AdSense.
  const body = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
