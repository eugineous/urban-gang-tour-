import {NextResponse} from 'next/server';
import {validatedCurrentBuyer,ensureCustomerAccountSchema} from '@/lib/server/customer-account';
import {claimGuestOrder} from '@/lib/server/customer-order-claim';
import {requireOrigin} from '@/lib/server/origin';
import {readJsonObject} from '@/lib/server/json-body';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request){
 if(!requireOrigin(request))return reply({error:'bad_origin'},403);
 if(!rateLimit('account-order-claim:'+clientIp(request),120,60000))return reply({error:'too_many_requests'},429);
 try{
  const user=await validatedCurrentBuyer(request);if(!user)return reply({error:'login_required'},401);
  const parsed=await readJsonObject(request,2048);if(!parsed.ok)return reply({error:parsed.error},parsed.status);
  const b=parsed.value;if(Object.keys(b).length!==1||typeof b.ref!=='string'||b.ref.length>44||!/^ORD-[A-Z0-9]+[A-F0-9]{24}$/.test(b.ref))return reply({error:'invalid_reference'},400);
  await ensureCustomerAccountSchema();
  return await claimGuestOrder(user.id,b.ref)?reply({ok:true}):reply({error:'order_not_claimable'},404);
 }catch{return reply({error:'account_lookup_failed'},503)}
}
