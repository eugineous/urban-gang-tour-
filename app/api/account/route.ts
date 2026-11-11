import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { customerOrders, ensureCustomerAccountSchema, validatedCurrentBuyer } from '@/lib/server/customer-account';
import { clientIp, rateLimit } from '@/lib/server/ratelimit';
import {accountPage,accountPageLimits,accountPagination,parseAccountQuery} from '@/lib/server/account-pagination';

// Buyer only. Every order and ticket is scoped to the signed account ID.
export async function GET(req: Request) {
  if (!rateLimit('customer-account:'+clientIp(req), 30, 60000, req)) return NextResponse.json({error:'too_many_requests'}, {status:429});
  let user; try {user=await validatedCurrentBuyer(req);} catch {return NextResponse.json({error:'accounts_unavailable'}, {status:503});}
  if (!user || !Number.isInteger(user.id)) return NextResponse.json({error:'login_required'}, {status:401});
  if (!hasDb()) return NextResponse.json({error:'accounts_unavailable'}, {status:503});
  let query;
  try {query=parseAccountQuery(new URL(req.url).searchParams);}
  catch {return NextResponse.json({error:'invalid_account_query'},{status:400,headers:{'Cache-Control':'private, no-store'}});}
  try {
    await ensureCustomerAccountSchema();
    const profile=await q('SELECT id,name,email,phone,created_at FROM users WHERE id=$1', [user.id]);
    if (!profile.length) return NextResponse.json({error:'login_required'}, {status:401});
    const {cursors,download}=query;
    const orderRows=await customerOrders(user.id,cursors.orderCursor);
    const ticketRows=await q<{code:string;created_at:string}>(`SELECT t.code,t.event_id,t.tier_name,t.holder,t.used_at,t.order_id,t.created_at::text AS created_at
      FROM tickets t JOIN orders o ON o.id=t.order_id
      WHERE o.user_id=$1 AND to_jsonb(t)->>'voided_at' IS NULL
       AND (o.status IN ('paid','fulfilled') OR (o.status='partially_refunded' AND to_jsonb(o)->>'ticket_refund_policy'='allocated'))
       AND ($2::timestamptz IS NULL OR (t.created_at,t.code)<($2::timestamptz,$3::text))
       ORDER BY t.created_at DESC,t.code DESC LIMIT 201`, [user.id,cursors.ticketCursor?.createdAt??null,cursors.ticketCursor?.id??null]);
    const requestRows=await q<{id:string;created_at:string}>(`SELECT id,kind,status,created_at::text AS created_at FROM customer_privacy_requests
      WHERE user_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::text))
      ORDER BY customer_privacy_requests.created_at DESC,customer_privacy_requests.id DESC LIMIT 21`, [user.id,cursors.requestCursor?.createdAt??null,cursors.requestCursor?.id??null]);
    const orders=accountPage(orderRows,accountPageLimits.orders,row=>row.id);
    const tickets=accountPage(ticketRows,accountPageLimits.tickets,row=>row.code);
    const requests=accountPage(requestRows,accountPageLimits.requests,row=>row.id);
    const pagination=accountPagination(cursors,{orders:orders.nextCursor,tickets:tickets.nextCursor,requests:requests.nextCursor});
    const body={profile:profile[0],orders:orders.items,tickets:tickets.items,requests:requests.items,pagination};
    if (download) return new NextResponse(JSON.stringify(body,null,2), {headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="urban-gang-account-page.json"','Cache-Control':'private, no-store'}});
    return NextResponse.json(body,{headers:{'Cache-Control':'private, no-store'}});
  } catch { return NextResponse.json({error:'account_lookup_failed'}, {status:503}); }
}
