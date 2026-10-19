import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {verifyAdminSession,hasPerm,isSuperAdmin,adminActor} from '@/lib/server/session';
import {requireOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {readJsonObject} from '@/lib/server/json-body';
import {editorialBundle,editorialSlug} from '@/lib/editorial-import';
import {ensureEditorialSchema} from '@/lib/server/editorial-schema';
import {importEditorial,reviewEditorial,holdEditorial,updateEditorial} from '@/lib/server/editorial';
import {invalidate} from '@/lib/server/microcache';
import {revalidatePath} from 'next/cache';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
async function guard(req:Request,write=false){
  if(!await verifyAdminSession(req))return reply({error:'unauthorized'},401);
  if(!hasPerm(req,'content')||write&&!isSuperAdmin(req))return reply({error:'forbidden'},403);
  if(write&&!requireOrigin(req))return reply({error:'bad_origin'},403);
  if(!rateLimit('editorial:'+clientIp(req),write?30:120,60000))return reply({error:'too_many_requests'},429);
  if(!hasDb())return reply({error:'editorial_unavailable'},503);
}
/** Existing authenticated Content staff may read. Only owner/super-admin may import, edit, approve or hold. */
export async function GET(req:Request){
  const blocked=await guard(req);if(blocked)return blocked;
  const params=new URL(req.url).searchParams,slug=params.get('slug');
  if([...params.keys()].some(k=>k!=='slug')||slug&&!editorialSlug(slug))return reply({error:'invalid_request'},400);
  try{
    await ensureEditorialSchema();
    if(slug){const rows=await q(`SELECT slug,headline,editorial_source,editorial_review,asset_manifest,editorial_revision,editorial_status,published,scheduled_at,published_at FROM posts WHERE slug=$1 AND editorial_managed`,[slug]);return rows.length?reply({ok:true,item:rows[0]}):reply({error:'not_found'},404)}
    const [items,monitor]=await Promise.all([
      q(`SELECT slug,headline,editorial_kind,editorial_status,editorial_revision,scheduled_at,published_at,published,scheduled_at<=now() AND NOT published AS overdue FROM posts WHERE editorial_managed ORDER BY scheduled_at,slug LIMIT 500`),
      q(`SELECT checked_at,released FROM editorial_monitor WHERE id=1`),
    ]);
    return reply({ok:true,items,monitor:monitor[0]||null,canPublish:isSuperAdmin(req),timezone:'Africa/Nairobi',generationConfigured:false});
  }catch{return reply({error:'editorial_unavailable'},503)}
}
export async function POST(req:Request){
  const blocked=await guard(req,true);if(blocked)return blocked;
  const parsed=await readJsonObject(req,2*1024*1024);if(!parsed.ok)return reply({error:parsed.error},parsed.status);
  const d=parsed.value,actor=adminActor(req);
  try{
    if(d.action==='preview'||d.action==='import'){
      if(Object.keys(d).some(k=>!['action','bundle'].includes(k)))return reply({error:'invalid_request'},400);
      const result=await importEditorial(editorialBundle(d.bundle),actor,d.action==='preview');return reply({ok:true,...result});
    }
    if(!editorialSlug(d.slug)||!Number.isSafeInteger(d.revision)||Number(d.revision)<1)return reply({error:'invalid_request'},400);
    const allowed=d.action==='approve'?['action','slug','revision','review','assets']:d.action==='update'?['action','slug','revision','bundle']:['action','slug','revision'];
    if(Object.keys(d).some(k=>!allowed.includes(k)))return reply({error:'invalid_request'},400);
    let rows;
    if(d.action==='approve')rows=await reviewEditorial(d.slug,Number(d.revision),actor,d.review,d.assets);
    else if(d.action==='hold')rows=await holdEditorial(d.slug,Number(d.revision),actor);
    else if(d.action==='update'){
      const bundle=editorialBundle(d.bundle);if(bundle.items.length!==1||bundle.items[0].slug!==d.slug)return reply({error:'invalid_request'},400);
      rows=await updateEditorial(bundle.items[0],Number(d.revision),actor);
    }else return reply({error:'invalid_action'},400);
    if(!rows.length)return reply({error:'editorial_conflict'},409);
    invalidate('blog-published-posts');invalidate('site-posts');
    for(const path of ['/','/blog','/blog/'+d.slug,'/feed.xml','/sitemap.xml','/news-sitemap.xml','/image-sitemap.xml'])revalidatePath(path);
    return reply({ok:true,slug:d.slug});
  }catch(error){
    const code=error instanceof Error?error.message:'';
    const known=/^(invalid_|incomplete_|duplicate_|nairobi_|review_|image_|private_editorial_|separate_|illustration_|editorial_conflict)/.test(code);
    return reply({error:known?code:'editorial_unavailable'},code==='editorial_conflict'?409:known?400:503);
  }
}
