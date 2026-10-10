import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { customerOrders, ensureCustomerAccountSchema, validatedCurrentBuyer } from '@/lib/server/customer-account';
import { clientIp, rateLimit } from '@/lib/server/ratelimit';

// Buyer only. Every order and ticket is scoped to the signed account ID.
export async function GET(req: Request) {
  if (!rateLimit('customer-account:'+clientIp(req), 30, 60000, req)) return NextResponse.json({error:'too_many_requests'}, {status:429});
  let user; try {user=await validatedCurrentBuyer(req);} catch {return NextResponse.json({error:'accounts_unavailable'}, {status:503});}
  if (!user || !Number.isInteger(user.id)) return NextResponse.json({error:'login_required'}, {status:401});
  if (!hasDb()) return NextResponse.json({error:'accounts_unavailable'}, {status:503});
  try {
    await ensureCustomerAccountSchema();
    const profile=await q('SELECT id,name,email,phone,created_at FROM users WHERE id=$1', [user.id]);
    if (!profile.length) return NextResponse.json({error:'login_required'}, {status:401});
    const download=new URL(req.url).searchParams.get('download')==='1';
    const orders=await customerOrders(user.id,download);
    const tickets=await q(`SELECT t.code,t.event_id,t.tier_name,t.holder,t.used_at,t.order_id
      FROM tickets t JOIN orders o ON o.id=t.order_id
      WHERE o.user_id=$1 AND o.status IN ('paid','fulfilled') ORDER BY t.created_at DESC ${download ? '' : 'LIMIT 300'}`, [user.id]);
    const requests=await q('SELECT id,kind,status,created_at FROM customer_privacy_requests WHERE user_id=$1 ORDER BY created_at DESC', [user.id]);
    const body={profile:profile[0], orders, tickets, requests};
    if (download) return new NextResponse(JSON.stringify(body,null,2), {headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="urban-gang-account.json"','Cache-Control':'private, no-store'}});
    return NextResponse.json(body,{headers:{'Cache-Control':'private, no-store'}});
  } catch { return NextResponse.json({error:'account_lookup_failed'}, {status:503}); }
}
