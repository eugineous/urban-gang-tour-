import {NextResponse} from 'next/server';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {q} from '@/lib/server/db';
import {ensureRefundSchema} from '@/lib/server/refunds';
export async function GET(req:Request){
 const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
 if(!hasPerm(req,'orders'))return reply({error:'forbidden'},403);
 if(!rateLimit('refund-history:'+clientIp(req),30,60000,req))return reply({error:'too_many_requests'},429);
 const id=new URL(req.url).searchParams.get('orderId')||'';if(!/^ORD-[A-Z0-9-]{4,40}$/.test(id))return reply({error:'invalid_order_id'},400);
 try{await ensureRefundSchema();const records=await q('SELECT id,amount,reason,actor,external_reference,resulting_status,created_at::text FROM refunds WHERE order_id=$1 ORDER BY created_at,id',[id]);return reply({ok:true,records})}catch{return reply({error:'refund_history_unavailable'},503)}
}
