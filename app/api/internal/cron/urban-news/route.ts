import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {runUrbanNewsAutomation} from '@/lib/server/urban-news-automation';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';

export const dynamic='force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
/** Only the existing server-owned scheduler credential authorizes this route. */
export async function POST(request:Request){const secret=process.env.UGT_CRON_SECRET||'';if(!secret)return reply({error:'news_scheduler_not_configured'},503);const given=Buffer.from(request.headers.get('x-ugt-cron')||''),expected=Buffer.from(secret);if(given.length!==expected.length||!timingSafeEqual(given,expected))return reply({error:'unauthorized'},401);if(!rateLimit('urban-news-cron:'+clientIp(request),12,60_000))return reply({error:'too_many_requests'},429);try{const result=await runUrbanNewsAutomation();return reply(result,result.state==='failed'||result.state==='unknown'?503:200)}catch{return reply({ok:false,state:'failed',code:'news_job_unavailable'},503)}}
