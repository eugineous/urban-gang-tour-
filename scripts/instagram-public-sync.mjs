// Public browser import only: no Instagram login, session cookies or private API calls.
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {INSTAGRAM_ACCOUNT,INSTAGRAM_PROFILE,INSTAGRAM_REPOSITORY,normalizeOwnedInstagramUrl,extractPublicInstagramPosts,validInstagramCdnUrl,validateInstagramArchive} from '../lib/instagram-public.mjs';
const exec=promisify(execFile),manifestPath=fileURLToPath(new URL('../ui/data/instagram-library.json',import.meta.url));
const MAX_FILE=250*1024*1024,MAX_BATCH=1024*1024*1024;
import {TAG,gh,releaseInfo,archiveIndex,readPublicIndex,reconcileInstagramProjection,publishIndex} from './instagram-github-store.mjs';
import {knownVisibleInstagramLinks} from './instagram-discovery-counts.mjs';
export async function collectPublicInstagram(profile=INSTAGRAM_PROFILE,{maxScrolls=3,knownCodes=new Set()}={}){
 const normalized=normalizeOwnedInstagramUrl(profile);if(!normalized)throw Error('only_owned_instagram_allowed');
 const proxyUrl=process.env.HTTPS_PROXY||process.env.HTTP_PROXY,u=proxyUrl?new URL(proxyUrl):null;
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox'],...(u?{proxy:{server:u.protocol+'//'+u.host,username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}}:{})});
 const records=new Map(),pending=[],http=[];let throttled=false;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),page=await context.newPage();
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());const host=u.hostname;
   const allowed=host==='www.instagram.com'||host==='instagram.com'||host.endsWith('.cdninstagram.com')||host.endsWith('.fbcdn.net');
   const read=['GET','HEAD'].includes(r.method())||r.method()==='POST'&&host==='www.instagram.com'&&/^\/(?:graphql\/query|api\/graphql)\/?$/.test(u.pathname);
   return allowed&&read?route.continue():route.abort();
  });
  page.on('response',response=>{const u=new URL(response.url());if(u.hostname!=='www.instagram.com'||!/graphql|\/api\/v1\/(feed|media|users)/.test(u.pathname))return;
   if(response.status()===429)throttled=true;if(http.length<20)http.push({path:u.pathname,status:response.status()});
   if(response.ok())pending.push(response.text().then(text=>{if(text.length>12*1024*1024)return;for(const line of text.replace(/^for\s*\(;;\);\s*/,'').split('\n')){try{for(const post of extractPublicInstagramPosts(JSON.parse(line)))records.set(post.id,post)}catch{/* Not a public media JSON object. */}}}).catch(()=>{}));
  });
  const response=await page.goto(normalized,{waitUntil:'domcontentloaded',timeout:45000});if(!response?.ok())throw Error('instagram_page_unavailable');
  const html=await response.text();for(const match of html.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)){try{for(const post of extractPublicInstagramPosts(JSON.parse(match[1])))records.set(post.id,post)}catch{/* Ordinary page boot/config JSON is not media. */}}
  await page.waitForTimeout(8000);let previous=-1;
  for(let step=0;step<maxScrolls&&!throttled;step++){
   if(new URL(page.url()).pathname.startsWith('/accounts/login'))break;
   const count=await page.locator('a[href*="/p/"],a[href*="/reel/"]').count();if(count===previous)break;previous=count;
   await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(2500);
  }
  await Promise.all(pending);if(throttled)throw Error('instagram_rate_limited_no_bypass');
  const visible=await page.locator('a[href*="/p/"],a[href*="/reel/"]').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
  const links=/\/(p|reel)\//.test(normalized)?[normalized]:[...new Set(visible.map(path=>{try{return normalizeOwnedInstagramUrl(new URL(path,INSTAGRAM_PROFILE).href)}catch{return null}}).filter(url=>url&&/\/(p|reel)\//.test(url)))];
  const failures=[];
  for(const url of links.slice(0,12)){
   const code=new URL(url).pathname.split('/').filter(Boolean).at(-1);if(knownCodes.has(code))continue;if([...records.values()].some(post=>post.code===code))continue;
   try{
    const {stdout}=await exec(process.env.PYTHON_BIN||'python',[fileURLToPath(new URL('./instagram-public-metadata.py',import.meta.url)),url],{timeout:90000,maxBuffer:8*1024*1024});
    const posts=extractPublicInstagramPosts(JSON.parse(stdout));if(posts.length!==1||posts[0].code!==code)throw Error('ownership_or_public_metadata_unavailable');
    records.set(posts[0].id,posts[0]);
   }catch(error){if(String(error.stderr||'').includes('rate_limited'))throw Error('instagram_rate_limited_no_bypass');failures.push({code,error:'owned_public_post_unavailable'})}
  }
  const requested=/\/(p|reel)\//.test(normalized)?new URL(normalized).pathname.split('/').filter(Boolean).at(-1):null;
  const posts=[...records.values()].filter(post=>!requested||post.code===requested);
  return{posts,knownVisible:knownVisibleInstagramLinks(links.slice(0,12),knownCodes,posts),failures,coverage:'Public browser-visible posts only; login-gated or older history is not guaranteed.',http};
 }finally{await browser.close()}
}
function signature(bytes,kind){
 if(kind==='video')return bytes.length>=12&&bytes.subarray(4,8).toString('ascii')==='ftyp'?'mp4':null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'jpg';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png';
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return'webp';return null;
}
export async function downloadInstagramAsset(source,dir,budget){
 let url=source.url,response;
 for(let hops=0;hops<4;hops++){
  if(!validInstagramCdnUrl(url))throw Error('unsafe_instagram_media_host');
  response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(120000)});
  if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();url=new URL(response.headers.get('location')||'',url).href;continue}break;
 }
 if(!response?.ok||!response.body)throw Error('public_media_unavailable');
 if(response.status===206){const range=response.headers.get('content-range')?.match(/^bytes 0-(\d+)\/(\d+)$/);if(!range||Number(range[1])+1!==Number(range[2])){await response.body.cancel();throw Error('partial_media_not_archived')}}
 const declared=Number(response.headers.get('content-length')||0);if(declared>MAX_FILE){await response.body.cancel();throw Error('media_exceeds_250_mib')}
 const output=join(dir,source.id+'.download'),hash=createHash('sha256');let size=0,head=Buffer.alloc(0);
 await pipeline(Readable.fromWeb(response.body),new Transform({transform(chunk,encoding,callback){size+=chunk.length;budget.bytes+=chunk.length;if(size>MAX_FILE||budget.bytes>MAX_BATCH)return callback(Error('download_budget_exceeded'));if(head.length<64)head=Buffer.concat([head,chunk.subarray(0,64-head.length)]);hash.update(chunk);callback(null,chunk)}}),createWriteStream(output,{flags:'wx'}));
 const extension=signature(head,source.kind);if(!size||!extension)throw Error('unexpected_media_bytes');
 const sha256=hash.digest('hex'),id='ig-'+source.id+'-'+sha256.slice(0,16),file=id+'.'+extension;
 const localPath=join(dir,file);await rename(output,localPath);
 const probe=JSON.parse((await exec(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-show_streams','-show_format','-of','json',localPath],{timeout:30000,maxBuffer:256*1024})).stdout);
 const visual=probe.streams?.find(stream=>stream.codec_type==='video');if(!visual?.width||!visual?.height||visual.width>16000||visual.height>16000)throw Error('invalid_media_dimensions');
 const duration=Number(probe.format?.duration);if(source.kind==='video'&&(!Number.isFinite(duration)||duration<=0||source.hasAudio===true&&!probe.streams.some(stream=>stream.codec_type==='audio')||source.duration&&Math.abs(duration-source.duration)>1))throw Error('incomplete_video_or_audio');
 return{localPath,asset:{id,kind:source.kind,width:visual.width,height:visual.height,bytes:size,sha256,file,release:TAG,...(source.kind==='video'?{duration}:{})}};
}
async function upload(release,entry){
 const exists=(release.assets||[]).find(a=>a.name===entry.asset.file);if(exists){if(exists.size!==entry.asset.bytes)throw Error('github_asset_conflict');return}
 await gh(['release','upload',TAG,entry.localPath,'--repo',INSTAGRAM_REPOSITORY]);
}
export async function runInstagramImport({profile=INSTAGRAM_PROFILE,inspect=false,publish=false,rightsConfirmed=false,autoSync=true,scheduled=false}={}){
 if(!inspect&&!scheduled&&!rightsConfirmed)throw Error('republication_confirmation_required');
 const main=JSON.parse(await readFile(manifestPath,'utf8'));if(!validateInstagramArchive(main))throw Error('local_archive_manifest_invalid');
 let release=inspect?null:await releaseInfo();const stored=inspect?main:await archiveIndex(release)||main,known=new Map(stored.posts.map(p=>[p.id,p]));
 const dir=await mkdtemp(join(tmpdir(),'ugt-instagram-import-'));
 try{
 if(release)await reconcileInstagramProjection(stored,await readPublicIndex(release),value=>publishIndex(value,dir));
 if(scheduled){if(!stored.automation?.enabled)return{mode:'scheduled',state:'not_enabled',imported:0,failed:0};publish=stored.automation.publishGeneral===true;rightsConfirmed=true}
 if(!inspect&&!rightsConfirmed)throw Error('republication_confirmation_required');
 for(const post of main.posts)known.set(post.id,post);
 let discovered;try{discovered=await collectPublicInstagram(profile,{knownCodes:new Set([...known.values()].map(post=>post.code))});if(!discovered.posts.length&&!discovered.knownVisible)throw Error('no_owned_public_media_exposed_no_login_bypass');}catch(error){if(release)await publishIndex({...stored,lastChecked:new Date().toISOString()},dir,{archived:stored.posts.length,failed:1});throw error}
 if(inspect)return{mode:'inspect',discovered:discovered.posts.length,known:discovered.knownVisible,failed:discovered.failures.length,coverage:discovered.coverage};
 const fresh=discovered.posts.filter(post=>!known.has(post.id));
 const budget={bytes:0},failures=[...discovered.failures];let imported=0;
  for(const post of fresh.slice(0,12)){
   try{
    const entries=[],assets=[];for(const source of post.assets){const entry=await downloadInstagramAsset(source,dir,budget);entries.push(entry);
     if(source.poster){const poster=await downloadInstagramAsset({...source,id:source.id+'_0',kind:'photograph',url:source.poster,poster:null},dir,budget);entry.asset.poster=poster.asset;entries.push(poster)}assets.push(entry.asset);
    }
    if(!release){await gh(['release','create',TAG,'--repo',INSTAGRAM_REPOSITORY,'--title','Urban Gang Tour Instagram media archive','--notes','Public media from urban_newsgang. Source captions and hashes are retained in versioned archive indexes. Website publication follows the normal review workflow.']);release=await releaseInfo()}
    for(const entry of entries)await upload(release,entry);
    known.set(post.id,{...post,assets,published:publish,audience:publish?'general':'review'});imported++;
   }catch(error){failures.push({id:post.id,error:String(error.message||'import_failed').replace(/https?:\/\/\S+/g,'[url omitted]').slice(0,150)})}
  }
  // A previously uploaded checkpoint is reused if a later PR/build failed.
  const automation=scheduled?stored.automation:{enabled:autoSync,publishGeneral:publish};
  const value={version:1,account:INSTAGRAM_ACCOUNT,lastChecked:new Date().toISOString(),coverage:discovered.coverage,automation,summary:{archived:known.size,failed:failures.length},posts:[...known.values()]};
  if(!validateInstagramArchive(value))throw Error('generated_archive_manifest_invalid');
  // Explicit manual approval can release pending general-audience posts, never an already withdrawn/adult record.
  if(publish&&!scheduled)for(const post of value.posts)if(post.audience==='review'){post.published=true;post.audience='general'}
  if(release&&(imported||!scheduled)){
   const checkpoint=join(dir,'archive-index-'+Date.now()+'.json');await writeFile(checkpoint,JSON.stringify(value));await gh(['release','upload',TAG,checkpoint,'--repo',INSTAGRAM_REPOSITORY]);
  }
  if(release)await publishIndex(value,dir,value.summary);
  return{mode:'archive',discovered:discovered.posts.length+discovered.knownVisible,imported,skipped:discovered.knownVisible+discovered.posts.length-fresh.length,failed:failures.length,failures,coverage:discovered.coverage,remainingVisible:Math.max(0,fresh.length-12)};
 }finally{await rm(dir,{recursive:true,force:true})}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL('file://'+process.argv[1]))){
 runInstagramImport({profile:process.env.IG_IMPORT_PROFILE||INSTAGRAM_PROFILE,inspect:process.argv.includes('--inspect'),publish:process.env.IG_IMPORT_PUBLISH_GENERAL==='true',rightsConfirmed:process.env.IG_IMPORT_RIGHTS_CONFIRMED==='true',autoSync:process.env.IG_IMPORT_AUTO_SYNC!=='false',scheduled:process.env.GITHUB_EVENT_NAME==='schedule'}).then(async result=>{console.log(JSON.stringify(result));if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,'## Instagram import\n\n'+JSON.stringify(result,null,2)+'\n',{flag:'a'});if(result.failed)process.exitCode=1}).catch(error=>{console.error('[instagram-import] '+String(error.message||'failed').replace(/https?:\/\/\S+/g,'[url omitted]').slice(0,200));process.exitCode=1});
}
