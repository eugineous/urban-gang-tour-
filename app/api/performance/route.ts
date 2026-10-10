import {NextResponse} from 'next/server';
import {q,hasDb} from '@/lib/server/db';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {verifyAdminSession,isSuperAdmin} from '@/lib/server/session';
import {validPerformanceSample} from '@/lib/server/performance-metrics';
export const dynamic='force-dynamic';
let schemaReady:Promise<void>|undefined;
async function schema(){if(!schemaReady)schemaReady=(async()=>{await q(`CREATE TABLE IF NOT EXISTS public_performance_samples(id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,value DOUBLE PRECISION NOT NULL,path TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);await q('CREATE INDEX IF NOT EXISTS idx_public_performance_time ON public_performance_samples(created_at)')})().catch(error=>{schemaReady=undefined;throw error});return schemaReady}
// Anonymous, consented, bounded measurements. No identity, query string or device fingerprint is recorded.
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});if(!rateLimit('performance:'+clientIp(req),30,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});const v=await req.json().catch(()=>null);if(!validPerformanceSample(v))return NextResponse.json({error:'invalid_sample'},{status:400});if(!hasDb())return NextResponse.json({error:'monitoring_unavailable'},{status:503});try{await schema();await q('INSERT INTO public_performance_samples(name,value,path) VALUES($1,$2,$3)',[v.name,v.value,v.path]);return new NextResponse(null,{status:204})}catch{return NextResponse.json({error:'monitoring_unavailable'},{status:503})}}
// Super-admin only; percentile summaries contain no visitor identity.
export async function GET(req:Request){if(!(await verifyAdminSession(req))||!isSuperAdmin(req))return NextResponse.json({error:'unauthorized'},{status:401});if(!hasDb())return NextResponse.json({error:'monitoring_unavailable'},{status:503});try{await schema();const rows=await q(`SELECT name,COUNT(*)::int AS samples,PERCENTILE_CONT(0.75) WITHIN GROUP(ORDER BY value) AS p75 FROM public_performance_samples WHERE created_at>now()-interval '28 days' GROUP BY name ORDER BY name`);return NextResponse.json({rows},{headers:{'Cache-Control':'private, no-store'}})}catch{return NextResponse.json({error:'monitoring_unavailable'},{status:503})}}
