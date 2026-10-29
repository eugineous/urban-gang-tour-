import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/server/origin';
import {checkoutPrincipal} from '@/lib/server/checkout-session';
import {findOwnedMpesaAttempt} from '@/lib/server/mpesa-attempts';
import {findOwnedPaystackAttempt} from '@/lib/server/paystack-attempts';
import {clientIp,rateLimit,PUBLIC_READ_NETWORK_LIMIT} from '@/lib/server/ratelimit';
// Same signed guest browser only. Never returns purchase/contact/address data.
export async function POST(req:Request){
 const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!sameOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('checkout-recovery:'+clientIp(req),30,60000,req,PUBLIC_READ_NETWORK_LIMIT))return reply({error:'too_many_requests'},429);
 const owner=checkoutPrincipal(req);if(!owner)return reply({error:'checkout_session_required'},428);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='key'&&key!=='provider')||body.provider!==undefined&&body.provider!=='mpesa'&&body.provider!=='paystack'||typeof body.key!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(body.key))return reply({error:'invalid_attempt_token'},400);
 try{
  if(body.provider==='paystack'){
   const attempt=await findOwnedPaystackAttempt(owner,body.key);
   return attempt?reply({ok:true,id:attempt.orderId,total:attempt.total,attemptState:attempt.state,paymentStatus:attempt.paymentStatus,...(attempt.state==='ready'&&['pending','unknown','reconciling'].includes(attempt.paymentStatus)&&attempt.authorizationUrl?{authorizationUrl:attempt.authorizationUrl}:{})}):reply({error:'attempt_not_found'},404);
  }
  const attempt=await findOwnedMpesaAttempt(owner,body.key);return attempt?reply({ok:true,id:attempt.orderId,total:attempt.total,attemptState:attempt.state,paymentStatus:attempt.paymentStatus}):reply({error:'attempt_not_found'},404);
 }
 catch{return reply({error:'recovery_unavailable'},503)}
}
