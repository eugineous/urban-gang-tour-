import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {releaseDueEditorial} from '@/lib/server/editorial';
import {importStagedEditorialLibrary,recordEditorialHeartbeat} from '@/lib/server/editorial-library';
import {invalidate} from '@/lib/server/microcache';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req:Request){
  const secret=process.env.UGT_CRON_SECRET||'',given=req.headers.get('x-ugt-cron')||'';
  if(!secret)return reply({error:'editorial_scheduler_not_configured'},503);
  if(Buffer.byteLength(given)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return reply({error:'unauthorized'},401);
  try{
    const library=await importStagedEditorialLibrary();
    const outcome=await releaseDueEditorial();
    await recordEditorialHeartbeat({ok:true,...outcome,library});
    invalidate('blog-published-posts');invalidate('site-posts');
    return reply({ok:true,...outcome,library});
  }catch{
    await recordEditorialHeartbeat({ok:false,error:'editorial_check_failed'}).catch(()=>{});
    console.error('[editorial-monitor] check failed; no unverified item released');
    return reply({error:'editorial_check_failed'},503);
  }
}
