import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/server/origin';
import {clientIp,rateLimit,PURCHASE_NETWORK_LIMIT} from '@/lib/server/ratelimit';
import {CHECKOUT_COOKIE,checkoutPrincipal,createCheckoutSession} from '@/lib/server/checkout-session';
// Public, same-origin. Establishes a signed guest scope, NOT an admin/buyer login.
export async function POST(req:Request){
 const reply=(data:object,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!sameOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('checkout-session:'+clientIp(req),30,60000,req,PURCHASE_NETWORK_LIMIT))return reply({error:'too_many_requests'},429);
 if((await req.text()).trim())return reply({error:'unexpected_body'},400);
 if(checkoutPrincipal(req))return reply({ok:true,created:false});
 try{const token=createCheckoutSession(),response=reply({ok:true,created:true});response.cookies.set(CHECKOUT_COOKIE,token,{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:30*86400});return response}
 catch{return reply({error:'checkout_session_unavailable'},503)}
}
