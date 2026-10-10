import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {processEmailOutbox} from '@/lib/server/email-outbox';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
export const dynamic='force-dynamic';
// Role: internal Worker scheduler with server-owned UGT_CRON_SECRET only.
export async function POST(req:Request) {
  const secret=process.env.UGT_CRON_SECRET||'';
  if (!secret) return NextResponse.json({error:'automation_not_configured'},{status:503});
  const supplied=Buffer.from(req.headers.get('x-ugt-cron')||'');const expected=Buffer.from(secret);
  if (supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!rateLimit('email-cron:'+clientIp(req),20,60_000)) return NextResponse.json({error:'too_many_requests'},{status:429});
  try {return NextResponse.json({ok:true,outcomes:await processEmailOutbox(5)},{headers:{'Cache-Control':'private, no-store'}});}
  catch {return NextResponse.json({error:process.env.RESEND_API_KEY?'email_outbox_unavailable':'email_not_configured'},{status:503});}
}
