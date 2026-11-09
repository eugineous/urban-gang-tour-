import {publishedInstagramFile} from '@/lib/instagram-archive';
import {githubInstagramAssetUrl} from '@/lib/instagram-public.mjs';
import {readPublicInstagramArchive,fetchGithubInstagramAsset} from '@/lib/server/instagram-archive';
import {clientIp,rateLimit} from '@/lib/server/ratelimit';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const bad=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
/** Public immutable-content identity; publication is checked before any upstream byte request. */
async function serve(request:Request,{params}:Context,head=false){
 if(!rateLimit('instagram-bytes:'+clientIp(request),120,60000,request))return bad(429);
 const {id}=await params;if(!/^ig-[0-9_]{5,81}-[a-f0-9]{16}$/.test(id))return bad(404);
 try{
  const file=publishedInstagramFile(await readPublicInstagramArchive(),id);if(!file)return bad(404);
  const range=request.headers.get('range');if(range&&(!/^bytes=(?:\d+-\d*|-\d+)$/.test(range)||range.length>80||range==='bytes=-0'))return bad(416);
  if(range){const part=range.match(/^bytes=(\d+)-(\d*)$/);if(part&&(Number(part[1])>=file.bytes||part[2]&&Number(part[2])<Number(part[1])))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+file.bytes,'Cache-Control':'no-store'}})}
  const etag='"'+file.sha256+'"';if(!range&&request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{ETag:etag,'Cache-Control':'public, max-age=300'}});
  const response=await fetchGithubInstagramAsset(githubInstagramAssetUrl(file),{method:head?'HEAD':'GET',...(range?{range}:{})});
  if(![200,206].includes(response.status)){await response.body?.cancel();return bad(response.status===404?404:502)}
  const headers=new Headers({'Content-Type':file.kind==='video'?'video/mp4':file.file.endsWith('.png')?'image/png':file.file.endsWith('.webp')?'image/webp':'image/jpeg','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes',ETag:etag,'Cache-Control':'public, max-age=300, s-maxage=300, must-revalidate'});
  const length=response.headers.get('content-length'),contentRange=response.headers.get('content-range');
  if(response.status===206){const parsed=contentRange?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);if(!parsed||Number(parsed[3])!==file.bytes||Number(parsed[1])>Number(parsed[2])||Number(parsed[2])>=file.bytes){await response.body?.cancel();return bad(502)}headers.set('Content-Range',contentRange!)}
  if(length){if(!/^\d+$/.test(length)||response.status===200&&Number(length)!==file.bytes){await response.body?.cancel();return bad(502)}headers.set('Content-Length',length)}
  if(head)await response.body?.cancel();return new Response(head?null:response.body,{status:response.status,headers});
 }catch{return bad(503)}
}
export const GET=(request:Request,context:Context)=>serve(request,context);
export const HEAD=(request:Request,context:Context)=>serve(request,context,true);
