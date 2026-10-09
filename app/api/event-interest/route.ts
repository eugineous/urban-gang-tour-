import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {hasDb,q} from '@/lib/server/db';
import {sameOrigin} from '@/lib/server/origin';
import {rateLimit,clientIp} from '@/lib/server/ratelimit';
import {cached} from '@/lib/server/microcache';
const digest=(id:string)=>createHash('sha256').update(id).digest('hex').slice(0,24);
export async function GET(req:Request){
 if(!rateLimit('interest-read:'+clientIp(req),60,60000,req))return NextResponse.json({error:'too_many_requests'},{status:429});
 if(!hasDb())return NextResponse.json({signals:[]});
 try{const rows=await cached('event-interest',60000,()=>q(`SELECT path,SUM(hits)::int AS hits FROM traffic WHERE day >= CURRENT_DATE - 6 AND path LIKE '/event-interest/%' GROUP BY path ORDER BY SUM(hits) DESC LIMIT 500`));
 return NextResponse.json({capturedAt:new Date().toISOString(),signals:rows.map((r:any)=>({key:r.path.split('/')[2],kind:r.path.split('/')[3],value:Number(r.hits)}))},{headers:{'Cache-Control':'public, max-age=60'}});
 }catch{return NextResponse.json({signals:[]})}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'bad_origin'},{status:403});
 if(!rateLimit('interest-write:'+clientIp(req),12,60000))return NextResponse.json({error:'too_many_requests'},{status:429});
 const b=await req.json().catch(()=>null);
 if(!b||Array.isArray(b)||Object.keys(b).some(k=>!['eventId','kind','consent'].includes(k))||b.consent!==true||typeof b.eventId!=='string'||b.eventId.length>160||!b.eventId.length||!['search','click','inquiry'].includes(b.kind))return NextResponse.json({error:'bad_request'},{status:400});
 if(!hasDb())return NextResponse.json({ok:false},{status:503});
 // Anonymous aggregate counters only: no search text, email, location or browser identifier.
 const path='/event-interest/'+digest(b.eventId)+'/'+b.kind;
 await q(`INSERT INTO traffic(day,path,hits) VALUES(CURRENT_DATE,$1,1) ON CONFLICT(day,path) DO UPDATE SET hits=traffic.hits+1`,[path]);
 return NextResponse.json({ok:true});
}
