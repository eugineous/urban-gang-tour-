import {NextResponse} from 'next/server';import {q,hasDb} from '@/lib/server/db';import {verifyAdminSession,hasPerm,adminActor} from '@/lib/server/session';import {sameOrigin} from '@/lib/server/origin';import {rateLimit,clientIp} from '@/lib/server/ratelimit';import library from '@/ui/data/media-library.json';import {cached,invalidate} from '@/lib/server/microcache';
export const dynamic='force-dynamic';
const validAsset=(v:unknown):v is string=>typeof v==='string'&&library.assets.some(a=>a.id===v&&a.kind==='video');
const publicAsset=(v:string)=>library.assets.some(a=>a.id===v&&a.kind==='video'&&!a.adult);
async function schema(){await q('CREATE TABLE IF NOT EXISTS media_captions(asset_id TEXT PRIMARY KEY, vtt TEXT NOT NULL, transcript TEXT NOT NULL, language TEXT NOT NULL DEFAULT \'en\', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())')}
// Public published caption tracks, never buyer data. Gallery-scoped admins import real transcripts.
export async function GET(req:Request){
 if(!rateLimit('captions:'+clientIp(req),120,60000,req))return new NextResponse('Too many requests',{status:429});
 const url=new URL(req.url),id=url.searchParams.get('asset'),json=url.searchParams.get('format')==='json';
 if(!validAsset(id)||!publicAsset(id))return new NextResponse('Invalid public video asset',{status:400});
 if(!hasDb())return new NextResponse('Unavailable',{status:503});
 try{
  const rows=await cached('caption:'+id,30000,async()=>{await schema();return q('SELECT vtt,transcript,language,updated_at FROM media_captions WHERE asset_id=$1',[id])});
  const headers={'Cache-Control':'public, max-age=30','X-Content-Type-Options':'nosniff'};
  if(!rows.length)return json?NextResponse.json({available:false,asset:id},{headers}):new NextResponse('Not found',{status:404});
  if(json)return NextResponse.json({available:true,asset:id,language:rows[0].language,transcript:rows[0].transcript,track:'/api/captions?asset='+encodeURIComponent(id)+'&rev='+encodeURIComponent(String(rows[0].updated_at))},{headers});
  return new NextResponse(rows[0].vtt,{headers:{...headers,'Content-Type':'text/vtt; charset=utf-8'}});
 }catch{return new NextResponse('Unavailable',{status:503})}
}
export async function POST(req:Request){if(!sameOrigin(req)||!await verifyAdminSession(req)||!hasPerm(req,'gallery'))return NextResponse.json({error:'forbidden'},{status:403});const b=await req.json().catch(()=>null);if(!b||Object.keys(b).some(k=>!['asset_id','vtt','transcript','language'].includes(k))||!validAsset(b.asset_id)||typeof b.vtt!=='string'||!/^WEBVTT(?:\r?\n|$)/.test(b.vtt)||!/(?:^|\n)(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/.test(b.vtt)||b.vtt.length>100000||typeof b.transcript!=='string'||!b.transcript.trim()||b.transcript.length>100000||typeof b.language!=='string'||!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(b.language))return NextResponse.json({error:'invalid_caption'},{status:400});if(!hasDb())return NextResponse.json({error:'unavailable'},{status:503});try{await schema();await q('INSERT INTO media_captions(asset_id,vtt,transcript,language) VALUES($1,$2,$3,$4) ON CONFLICT(asset_id) DO UPDATE SET vtt=EXCLUDED.vtt,transcript=EXCLUDED.transcript,language=EXCLUDED.language,updated_at=now()',[b.asset_id,b.vtt,b.transcript,b.language]);await q('INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3::jsonb)',[adminActor(req),'caption.import',JSON.stringify({asset_id:b.asset_id,language:b.language})]).catch(()=>{});invalidate('caption:'+b.asset_id);return NextResponse.json({ok:true,track:'/api/captions?asset='+b.asset_id})}catch{return NextResponse.json({error:'unavailable'},{status:503})}}
