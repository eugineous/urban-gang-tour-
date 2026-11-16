import {NextResponse,after} from 'next/server';
import {q} from '@/lib/server/db';
import {checkPassword} from '@/lib/server/session';
import {validatedCurrentBuyer} from '@/lib/server/customer-account';
import {ensureCustomerIdentitySchema} from '@/lib/server/customer-identity';
import {requestEmailVerification,confirmEmailVerification,deliverSecurityEmailJob} from '@/lib/server/customer-email-verification';
import {normalizeCustomerEmail} from '@/lib/shared/customer-identity';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 if(!rateLimit('account-verification-read:'+clientIp(request),60,60000,request))return reply({error:'too_many_requests'},429);
 try{
  const user=await validatedCurrentBuyer(request);if(!user)return reply({error:'login_required'},401);await ensureCustomerIdentitySchema();
  const rows=await q(`SELECT u.email,u.email_verified_at,p.email AS pending_email,
  (SELECT status FROM customer_security_email_outbox WHERE user_id=u.id AND purpose='verification' ORDER BY created_at DESC,id DESC LIMIT 1) AS delivery_status
  FROM users u LEFT JOIN customer_email_proofs p ON p.user_id=u.id AND p.used_at IS NULL
  AND p.expires_at>now() AND p.attempts<5 AND p.session_version=u.session_version WHERE u.id=$1`,[user.id]);
  if(!rows[0])return reply({error:'login_required'},401);
  return reply({email:rows[0].email,verified:!!rows[0].email_verified_at,pendingEmail:rows[0].pending_email||null,deliveryStatus:rows[0].delivery_status||null,deliveryConfigured:!!process.env.RESEND_API_KEY&&!!process.env.SESSION_SECRET});
 }catch{return reply({error:'accounts_unavailable'},503)}
}
export async function POST(request:Request){
 if(!requireOrigin(request))return reply({error:'bad_origin'},403);
 if(!rateLimit('account-verification:'+clientIp(request),60,60000))return reply({error:'too_many_requests'},429);
 try{
  const user=await validatedCurrentBuyer(request);if(!user)return reply({error:'login_required'},401);
  const parsed=await readJsonObject(request,2048);if(!parsed.ok)return reply({error:parsed.error},parsed.status);const b=parsed.value;
  if(b.action==='confirm'){
   if(Object.keys(b).some(key=>!['action','code'].includes(key))||typeof b.code!=='string'||!/^\d{8}$/.test(b.code))return reply({error:'invalid_request'},400);
   return await confirmEmailVerification(user.id,b.code)?reply({ok:true,verified:true}):reply({error:'invalid_or_expired_code'},400);
  }
  if(b.action!=='send'||Object.keys(b).some(key=>!['action','email','password'].includes(key))||typeof b.password!=='string'||b.password.length<6||b.password.length>100||typeof b.email!=='string')return reply({error:'invalid_request'},400);
  const email=normalizeCustomerEmail(b.email);if(!email)return reply({error:'invalid_email'},400);
  if(!process.env.RESEND_API_KEY||!process.env.SESSION_SECRET)return reply({error:'email_delivery_unavailable'},503);
  await ensureCustomerIdentitySchema();
  const rows=await q('SELECT email,pass_hash,session_version,email_verified_at FROM users WHERE id=$1',[user.id]),buyer=rows[0];
  if(!buyer||!checkPassword(b.password,buyer.pass_hash))return reply({error:'wrong_credentials'},401);
  if(buyer.email?.trim()&&normalizeCustomerEmail(buyer.email)!==email)return reply({error:'email_change_unavailable'},400);
  if(buyer.email_verified_at)return reply({ok:true,verified:true});
  const id=await requestEmailVerification(user.id,Number(buyer.session_version),email);
  if(!id)return reply({error:'verification_recently_requested'},429);
  after(async()=>{try{await deliverSecurityEmailJob(id)}catch{console.error('[account-verification] queued delivery unavailable')}});
  return reply({ok:true,state:'queued'},202);
 }catch(error){return error&&typeof error==='object'&&'code' in error&&error.code==='23505'?reply({error:'email_in_use'},409):reply({error:'accounts_unavailable'},503)}
}
