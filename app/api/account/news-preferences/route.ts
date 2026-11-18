import {NextResponse} from 'next/server';
import {validatedCurrentBuyer} from '@/lib/server/customer-account';
import {hasDb} from '@/lib/server/db';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {readNewsPreferences,saveNewsPreferences} from '@/lib/server/news-preferences';
import {parseNewsPreferences} from '@/lib/shared/news-preferences';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function handle(req:Request,write=false){
 if(write&&!requireOrigin(req))return reply({error:'bad_origin'},403);
 if(!rateLimit('news-reader-preferences:'+clientIp(req),30,60000,req))return reply({error:'too_many_requests'},429);
 try{
  const user=await validatedCurrentBuyer(req);if(!user)return reply({error:'sign_in_required'},401);
  if(!hasDb())return reply({error:'news_preferences_unavailable'},503);
  if(!write)return reply(await readNewsPreferences(user.id));
  const body=await readJsonObject(req,4096);if(!body.ok)return reply({error:body.error},body.status);
  const {expectedVersion,preferences:raw}=body.value,preferences=parseNewsPreferences(raw);
  if(Object.keys(body.value).length!==2||Object.keys(body.value).some(key=>!['expectedVersion','preferences'].includes(key))||!Number.isSafeInteger(expectedVersion)||Number(expectedVersion)<0||!preferences)return reply({error:'invalid_news_preferences'},400);
  return reply(await saveNewsPreferences(user.id,Number(expectedVersion),preferences));
 }catch(error){const code=error instanceof Error?error.message:'';return code==='news_preferences_conflict'?reply({error:code},409):code==='invalid_news_preferences'?reply({error:code},400):reply({error:'news_preferences_unavailable'},503)}
}
export async function GET(req:Request){return handle(req)}
export async function PUT(req:Request){return handle(req,true)}
