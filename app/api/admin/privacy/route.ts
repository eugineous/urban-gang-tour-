import { NextResponse } from 'next/server';
import { q, hasDb } from '@/lib/server/db';
import { verifyAdminSession, isSuperAdmin, adminActor } from '@/lib/server/session';
import { ensureCustomerAccountSchema } from '@/lib/server/customer-account';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
// Super-admin only: review privacy requests; never silently delete financial records.
export async function GET(req:Request) {
  if(!await verifyAdminSession(req)||!isSuperAdmin(req))return NextResponse.json({error:'unauthorized'},{status:401});
  if(!rateLimit('admin-privacy-read:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
  if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});
  try{await ensureCustomerAccountSchema();const requests=await q(`SELECT r.id,r.kind,r.status,r.created_at,r.resolution,u.name,u.email FROM customer_privacy_requests r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 200`);return NextResponse.json({requests},{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'unavailable'},{status:503});}
}
export async function PATCH(req:Request) {
  if(!await verifyAdminSession(req)||!isSuperAdmin(req))return NextResponse.json({error:'unauthorized'},{status:401});
  if(!requireOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
  if(!rateLimit('admin-privacy-write:'+clientIp(req),20,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
  const b=await req.json().catch(()=>null);
  if(!b||Object.keys(b).some(k=>!['id','status','resolution'].includes(k))||typeof b.id!=='string'||b.id.length>50||!['reviewing','closed'].includes(b.status)||typeof b.resolution!=='string'||b.resolution.length>2000||(b.status==='closed'&&b.resolution.trim().length<10))return NextResponse.json({error:'invalid_request'},{status:400});
  if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});
  try {await ensureCustomerAccountSchema();const rows=await q('UPDATE customer_privacy_requests SET status=$2,resolution=$3 WHERE id=$1 RETURNING id',[b.id,b.status,b.resolution]);if(!rows.length)return NextResponse.json({error:'not_found'},{status:404});await q('INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3::jsonb)',[adminActor(req),'privacy.request.review',JSON.stringify({id:b.id,status:b.status})]);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'unavailable'},{status:503});}
}
