import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {validatedCurrentBuyer,ensureCustomerAccountSchema} from '@/lib/server/customer-account';
// New guest orders use 24 random hex characters. Historical weaker references
// additionally require an authenticated, database-validated order owner.
// Never return contacts, delivery address or internal staff notes.
export async function GET(req:Request){
 if(!rateLimit('order-tracking:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 const id=new URL(req.url).searchParams.get('id')||'';const strong=/^ORD-[A-Z0-9]+[A-F0-9]{24}$/.test(id);
 if(!/^ORD-[A-Z0-9-]{4,40}$/.test(id))return NextResponse.json({error:'invalid_order_link'},{status:400});
 if(!hasDb())return NextResponse.json({error:'tracking_unavailable'},{status:503});
 try{
  let rows:any[];
  if(strong)rows=await q(`SELECT id,status FROM orders WHERE id=$1`,[id]);
  else{const buyer=await validatedCurrentBuyer(req);if(!buyer)return NextResponse.json({error:'sign_in_required'},{status:401});await ensureCustomerAccountSchema();rows=await q(`SELECT id,status FROM orders WHERE id=$1 AND user_id=$2`,[id,buyer.id]);}
  if(!rows.length)return NextResponse.json({error:'not_found'},{status:404});let fulfillment=null;let history:any[]=[];let preference=null;
  try{const f=await q(`SELECT status,handoff_method,reference,updated_at FROM merch_fulfillments WHERE order_id=$1`,[id]);fulfillment=f[0]||null;}catch{}
  try{history=await q(`SELECT status,created_at FROM merch_fulfillment_events WHERE order_id=$1 ORDER BY created_at ASC,id ASC`,[id]);}catch{}
  try{preference=(await q(`SELECT method,fee FROM order_delivery_preferences WHERE order_id=$1`,[id]))[0]||null;}catch{}
  return NextResponse.json({orderId:id,paymentStatus:rows[0].status,fulfillment,history,preference},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return NextResponse.json({error:'tracking_unavailable'},{status:503});}
}
