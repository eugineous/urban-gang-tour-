import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAdminSession,hasPerm } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import { rateLimit,clientIp } from '@/lib/server/ratelimit';
import { mediaConfigured,mediaPut } from '@/lib/server/media';
export const runtime='nodejs';
const purposes={events:'events',stories:'content',campaigns:'ops_promos'} as const;
const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as const;
const maxBytes=8*1024*1024;
function signature(bytes:Uint8Array,type:string){
  const b=Buffer.from(bytes);
  if(type==='image/jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  if(type==='image/png')return b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return type==='image/webp'&&b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';
}
export async function POST(req:Request){
  const json=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
  if(!await verifyAdminSession(req))return json('unauthorized',401);
  const purpose=new URL(req.url).searchParams.get('purpose');
  if(!purpose||!Object.hasOwn(purposes,purpose))return json('invalid_purpose',400);
  if(!hasPerm(req,purposes[purpose as keyof typeof purposes]))return json('forbidden',403);
  if(!requireOrigin(req))return json('bad_origin',403);
  if(!rateLimit('admin-media:'+clientIp(req),20,60000))return json('too_many_requests',429);
  const type=(req.headers.get('content-type')||'').split(';')[0].trim();
  if(!Object.hasOwn(types,type))return json('invalid_content_type',400);
  const length=req.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))))return json('invalid_size',400);
  if(length!==null&&Number(length)>maxBytes)return json('image_too_large',413);
  if(!mediaConfigured())return json('media_not_configured',503);
  if(!req.body)return json('invalid_image',400);
  const reader=req.body.getReader();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),30000)});
    const chunks:Uint8Array[]=[];let total=0;
    for(;;){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;total+=value.byteLength;if(total>maxBytes)return json('image_too_large',413);chunks.push(value)}
    const bytes=Buffer.concat(chunks,total);
    if(!total||!signature(bytes,type))return json('invalid_image',400);
    const {url}=await mediaPut(`admin-${purpose}/${randomUUID()}.${types[type as keyof typeof types]}`,bytes,{contentType:type});
    return NextResponse.json({url},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return json(error instanceof Error&&error.message==='timeout'?'upload_timeout':'upload_unavailable',error instanceof Error&&error.message==='timeout'?408:503)}
  finally{clearTimeout(timer);void reader.cancel().catch(()=>{})}
}
