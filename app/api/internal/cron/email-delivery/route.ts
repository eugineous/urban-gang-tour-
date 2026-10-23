import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {processEmailOutbox} from '@/lib/server/email-outbox';
import {processContactEmailOutbox} from '@/lib/server/contact-email-outbox';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
export const dynamic='force-dynamic';
// Role: internal Worker scheduler with server-owned UGT_CRON_SECRET only.
export async function POST(req:Request) {
  const secret=process.env.UGT_CRON_SECRET||'';
  if (!secret) return NextResponse.json({error:'automation_not_configured'},{status:503});
  const supplied=Buffer.from(req.headers.get('x-ugt-cron')||'');const expected=Buffer.from(secret);
  if (supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!rateLimit('email-cron:'+clientIp(req),20,60_000)) return NextResponse.json({error:'too_many_requests'},{status:429});
  try {
    const [receipts,contacts]=await Promise.allSettled([processEmailOutbox(5),processContactEmailOutbox(3)]);
    const module_errors={...(receipts.status==='rejected'?{receipts:'receipt_delivery_unavailable'}:{}),...(contacts.status==='rejected'?{contact:'contact_delivery_unavailable'}:{})};
    const ok=!Object.keys(module_errors).length;
    return NextResponse.json({ok,outcomes:receipts.status==='fulfilled'?receipts.value:[],contactOutcomes:contacts.status==='fulfilled'?contacts.value:[],module_errors},{status:ok?200:503,headers:{'Cache-Control':'private, no-store'}});
  }
  catch {return NextResponse.json({error:process.env.RESEND_API_KEY?'email_outbox_unavailable':'email_not_configured'},{status:503});}
}
