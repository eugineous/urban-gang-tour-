import {NextResponse} from 'next/server';
import {verifyAdminSession,hasPerm} from '@/lib/server/session';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
import {mediaStorageStatus} from '@/lib/server/media';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
 if(!hasPerm(req,'gallery'))return reply({error:'forbidden'},403);
 if(!rateLimit('media-budget:'+clientIp(req),30,60000))return reply({error:'too_many_requests'},429);
 try{return reply({ok:true,...await mediaStorageStatus()})}catch{return reply({error:'storage_status_unavailable'},503)}
}
