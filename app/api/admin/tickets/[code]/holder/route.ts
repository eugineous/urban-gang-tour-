// Roles: verified company admins with gate_scanner permission only. Never public.
import {NextResponse} from 'next/server';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {codeAuthentic} from '@/lib/server/tickets';
import {q} from '@/lib/server/db';
export async function GET(req:Request,{params}:{params:Promise<{code:string}>}){
 if(!(await verifyAdminSession(req)))return NextResponse.json({error:'unauthorized'},{status:401});
 if(!hasPerm(req,'gate_scanner'))return NextResponse.json({error:'forbidden'},{status:403});
 if(!rateLimit('holder:'+clientIp(req),30,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
 const {code}=await params;if(!codeAuthentic(code))return NextResponse.json({error:'not_found'},{status:404});
 try {
 const rows=await q('SELECT t.holder,t.used_at,o.email,o.phone FROM tickets t JOIN orders o ON o.id=t.order_id WHERE t.code=$1',[code]);
 if(!rows[0])return NextResponse.json({error:'not_found'},{status:404});
 await q("INSERT INTO audit_log (actor,action,detail) VALUES ('gate','holder_contact_access',$1)",[JSON.stringify({code})]);
 return NextResponse.json({holder:rows[0]},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch{return NextResponse.json({error:'lookup_failed'},{status:503});}
}
