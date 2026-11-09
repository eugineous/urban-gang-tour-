import {NextResponse} from 'next/server';
import {readPublicInstagramArchive} from '@/lib/server/instagram-archive';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
export const dynamic='force-dynamic';
/** Public GET: only approved general-audience media and original public captions. */
export async function GET(request:Request){
 if(!rateLimit('instagram-library:'+clientIp(request),60,60000,request))return NextResponse.json({error:'too_many_requests'},{status:429});
 try{return NextResponse.json({ok:true,archive:await readPublicInstagramArchive()},{headers:{'Cache-Control':'public, max-age=15, s-maxage=15'}})}catch{return NextResponse.json({error:'instagram_archive_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
