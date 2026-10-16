import {NextResponse} from 'next/server';
import {verifyAdminSession,hasPerm,adminActor} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {hasDb} from '@/lib/server/db';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {parseEventCategory} from '@/lib/event-categories';
import {listEventCategories,saveEventCategory} from '@/lib/server/event-categories';
export const dynamic='force-dynamic';
// Only real authenticated admins with Events permission. No public writes,
// automation bypass, secret query parameter or alternate login is provided.
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function guard(req:Request,write=false){
 if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
 if(!hasPerm(req,'events'))return reply({error:'forbidden'},403);
 if(write&&!requireOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('event-categories:'+(write?'write:':'read:')+clientIp(req),write?30:120,60_000))return reply({error:'too_many_requests'},429);
 if(!hasDb())return reply({error:'categories_unavailable'},503);
 return null;
}
export async function GET(req:Request){const blocked=await guard(req);if(blocked)return blocked;try{return reply({ok:true,rows:await listEventCategories()})}catch{return reply({error:'categories_unavailable'},503)}}
export async function POST(req:Request){
 const blocked=await guard(req,true);if(blocked)return blocked;
 const body=await readJsonObject(req,4096);if(!body.ok)return reply({error:body.error},body.status);
 const input=parseEventCategory(body.value);if(!input)return reply({error:'invalid_category'},400);
 try{return reply({ok:true,row:await saveEventCategory(input,adminActor(req))})}
 catch(error){const code=error instanceof Error?error.message:'';if(code==='category_exists'||(error as {code?:string})?.code==='23505')return reply({error:'category_exists'},409);if(code==='category_conflict')return reply({error:code},409);return reply({error:'categories_unavailable'},503)}
}
