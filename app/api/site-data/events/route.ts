import {NextResponse} from 'next/server';
import {rateLimit,clientIp,PUBLIC_READ_NETWORK_LIMIT} from '@/lib/server/ratelimit';
import {readPublicEvents} from '@/lib/server/public-events';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(req:Request){
 if(!rateLimit('site-events:'+clientIp(req),60,60_000,req,PUBLIC_READ_NETWORK_LIMIT))return NextResponse.json({error:'too_many_requests'},{status:429,headers});
 const kind=new URL(req.url).searchParams.get('kind');
 if(kind&&!['ticketed','school','past','partner'].includes(kind))return NextResponse.json({error:'invalid_kind'},{status:400,headers});
 try{return NextResponse.json({ok:true,events:await readPublicEvents(kind)},{headers})}
 catch{return NextResponse.json({ok:false,events:[],error:'events_unavailable'},{status:503,headers})}
}
