import {cached} from './microcache';
import {INSTAGRAM_ACCOUNT,INSTAGRAM_REPOSITORY,publicInstagramProjection,type InstagramPublicIndex} from '@/lib/instagram-public.mjs';
export const INSTAGRAM_INDEX_URL='https://github.com/'+INSTAGRAM_REPOSITORY+'/releases/download/instagram-media/instagram-public.json';
const empty={version:1,account:INSTAGRAM_ACCOUNT,posts:[]};
/** Fixed repository origins only. No cookies, credentials, arbitrary URLs or open proxy. */
export async function fetchGithubInstagramAsset(url:string,options:{method?:string;range?:string}={}){
 const initial=new URL(url),prefix='/'+INSTAGRAM_REPOSITORY+'/releases/download/';
 if(initial.origin!=='https://github.com'||!initial.pathname.startsWith(prefix)||initial.search||initial.hash)throw Error('invalid_github_archive_url');
 for(let hop=0;hop<4;hop++){
  const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.port||parsed.username||parsed.password||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(parsed.hostname))throw Error('unsafe_github_archive_redirect');
  const response=await fetch(url,{method:options.method||'GET',headers:{Accept:'application/octet-stream','Accept-Encoding':'identity',...(options.range?{Range:options.range}:{})},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if([301,302,303,307,308].includes(response.status)){const target=response.headers.get('location');await response.body?.cancel();if(!target)throw Error('invalid_github_archive_redirect');url=new URL(target,url).href;continue}return response;
 }throw Error('github_archive_redirect_limit');
}
export async function readPublicInstagramArchive():Promise<InstagramPublicIndex>{
 return cached('public-instagram-archive',15000,async()=>{
  const response=await fetchGithubInstagramAsset(INSTAGRAM_INDEX_URL);
  if(response.status===404){await response.body?.cancel();return publicInstagramProjection(empty)!}
  if(!response.ok||!response.body)throw Error('instagram_archive_unavailable');
  if(Number(response.headers.get('content-length')||0)>8*1024*1024){await response.body.cancel();throw Error('instagram_archive_too_large')}
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8*1024*1024)throw Error('instagram_archive_too_large');text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode()}catch(error){await reader.cancel();throw error}finally{reader.releaseLock()}
  const value=publicInstagramProjection(JSON.parse(text));if(!value)throw Error('instagram_archive_invalid');return value;
 });
}
