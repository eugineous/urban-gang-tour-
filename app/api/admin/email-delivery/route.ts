import {NextResponse} from 'next/server';
import {isSuperAdmin,verifyAdminSession} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {emailOutboxStatus,retryEmailOutbox} from '@/lib/server/email-outbox';
export const dynamic='force-dynamic';
// Role: super-admin only; email payloads/recipient details never returned.
const headers={'Cache-Control':'private, no-store'};
async function allowed(req:Request) {return await verifyAdminSession(req)&&isSuperAdmin(req);}
export async function GET(req:Request) {
  if (!await allowed(req)) return NextResponse.json({error:'forbidden'},{status:403});
  if (!rateLimit('email-status:'+clientIp(req),60,60_000,req)) return NextResponse.json({error:'too_many_requests'},{status:429});
  try {const result=await emailOutboxStatus();return NextResponse.json(result,{status:result.configured?200:503,headers});}
  catch {return NextResponse.json({error:'email_outbox_unavailable'},{status:503,headers});}
}
export async function POST(req:Request) {
  if (!await allowed(req)||!requireOrigin(req)) return NextResponse.json({error:'forbidden'},{status:403});
  if (!rateLimit('email-retry:'+clientIp(req),10,60_000,req)) return NextResponse.json({error:'too_many_requests'},{status:429});
  const body=await req.json().catch(()=>null);
  if (!body||Object.keys(body).length!==1||typeof body.id!=='string'||!/^receipt-[a-f0-9]{40}$/.test(body.id)) return NextResponse.json({error:'bad_request'},{status:400});
  if (!process.env.RESEND_API_KEY) return NextResponse.json({error:'email_not_configured'},{status:503,headers});
  try {const outcome=await retryEmailOutbox(body.id);return NextResponse.json({outcome},{status:outcome==='manual_review_required'?409:200,headers});}
  catch {return NextResponse.json({error:'email_outbox_unavailable'},{status:503,headers});}
}
