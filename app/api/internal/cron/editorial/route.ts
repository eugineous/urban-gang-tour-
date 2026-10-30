import {after,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {releaseDueEditorial} from '@/lib/server/editorial';
import {importStagedEditorialLibrary,recordEditorialHeartbeat,applyStagedOwnerEditorialApproval,applyStagedEditorialCompletion,applyStagedStoryArtwork,applyStagedLegacyMerchRetirement,applyStagedColorBlastActivation} from '@/lib/server/editorial-library';
import {invalidate} from '@/lib/server/microcache';
import {editorialSlug} from '@/lib/editorial-import';
import {pingIndexNow} from '@/lib/server/indexnow';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req:Request){
  const secret=process.env.UGT_CRON_SECRET||'',given=req.headers.get('x-ugt-cron')||'';
  if(!secret)return reply({error:'editorial_scheduler_not_configured'},503);
  if(Buffer.byteLength(given)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return reply({error:'unauthorized'},401);
  try{
    const library=await importStagedEditorialLibrary();
    const completion=await applyStagedEditorialCompletion();
    const ownerApproval=await applyStagedOwnerEditorialApproval();
    const artwork=await applyStagedStoryArtwork();
    const merchRetirement=await applyStagedLegacyMerchRetirement();
    const colourBlastActivation=await applyStagedColorBlastActivation();
    const {releasedSlugs,...outcome}=await releaseDueEditorial();
    const paths=Array.isArray(releasedSlugs)?releasedSlugs.filter(editorialSlug).map(slug=>'/blog/'+slug):[];
    if(outcome.released>0&&paths.length){
      // Crawl hints cannot publish, roll back or change the scheduler result.
      // Neither a future/held brief nor an editorial source payload is sent.
      try{after(async()=>{try{await pingIndexNow(['/','/blog',...paths]);}catch{console.warn('[editorial-indexing] crawl notification unavailable');}});}
      catch{console.warn('[editorial-indexing] background notification unavailable');}
    }
    await recordEditorialHeartbeat({ok:true,...outcome,library,completion,ownerApproval,artwork,merchRetirement,colourBlastActivation});
    invalidate('blog-published-posts');invalidate('blog-published-post-summaries');invalidate('site-posts');
    return reply({ok:true,...outcome,library,completion,ownerApproval,artwork,merchRetirement,colourBlastActivation});
  }catch{
    await recordEditorialHeartbeat({ok:false,error:'editorial_check_failed'}).catch(()=>{});
    console.error('[editorial-monitor] check failed; no unapproved item released');
    return reply({error:'editorial_check_failed'},503);
  }
}
