import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { q, hasDb } from '@/lib/server/db';
import { ensureCustomerAccountSchema, validatedCurrentBuyer } from '@/lib/server/customer-account';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

// Buyer only: a deletion request, not immediate destruction of financial records.
export async function POST(req:Request) {
  if(!requireOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  if(!rateLimit('account-privacy:'+clientIp(req),3,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
  let user;try{user=await validatedCurrentBuyer(req);}catch{return NextResponse.json({error:'accounts_unavailable'},{status:503});} if(!user)return NextResponse.json({error:'login_required'},{status:401});
  const b=await req.json().catch(()=>null);
  if(!b || Object.keys(b).some(k=>k!=='confirmation') || b.confirmation!=='DELETE MY ACCOUNT')return NextResponse.json({error:'confirmation_required'},{status:400});
  if(!hasDb())return NextResponse.json({error:'accounts_unavailable'},{status:503});
  try {
    await ensureCustomerAccountSchema();
    const rows=await q(`INSERT INTO customer_privacy_requests(id,user_id,kind)
      SELECT $1,id,'deletion' FROM users WHERE id=$2
      AND NOT EXISTS(SELECT 1 FROM customer_privacy_requests WHERE user_id=$2 AND status IN ('received','reviewing'))
      ON CONFLICT DO NOTHING RETURNING id,status,created_at`,[randomUUID(),user.id]);
    const request=rows[0] || (await q(`SELECT id,status,created_at FROM customer_privacy_requests WHERE user_id=$1 AND status IN ('received','reviewing') ORDER BY created_at DESC LIMIT 1`,[user.id]))[0];
    if(!request)return NextResponse.json({error:'login_required'},{status:401});
    return NextResponse.json({ok:true,request},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'request_unavailable'},{status:503});}
}
