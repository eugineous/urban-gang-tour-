export const INSTAGRAM_ACCOUNT='urban_newsgang';
export const INSTAGRAM_REPOSITORY='eugineous/urban-gang-tour-';
export const INSTAGRAM_PROFILE='https://www.instagram.com/'+INSTAGRAM_ACCOUNT+'/';
export const INSTAGRAM_WORKFLOW='https://github.com/'+INSTAGRAM_REPOSITORY+'/actions/workflows/instagram-import.yml';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const sourceId=value=>typeof value==='string'&&/^\d{5,40}(?:_\d{5,40})?$/.test(value)?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>9999?String(value):null;
export function normalizeOwnedInstagramUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname)||u.username||u.password||u.port)return null;
  const match=u.pathname.match(/^\/urban_newsgang(?:\/(p|reel)\/([A-Za-z0-9_-]{5,28}))?\/?$/i);if(!match)return null;
  return INSTAGRAM_PROFILE+(match[1]?match[1].toLowerCase()+'/'+match[2]+'/':'');
 }catch{return null}
}
export function validInstagramCdnUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&['cdninstagram.com','fbcdn.net'].some(host=>u.hostname===host||u.hostname.endsWith('.'+host))}catch{return false}}
function candidate(values){return(Array.isArray(values)?values:[]).filter(x=>object(x)&&validInstagramCdnUrl(x.url)&&Number.isFinite(x.width)&&Number.isFinite(x.height)&&x.width>0&&x.height>0&&x.width<=16000&&x.height<=16000).sort((a,b)=>b.width*b.height-a.width*a.height)[0]}
function mediaAsset(node){
 if(!object(node))return null;const id=sourceId(node.pk)||sourceId(node.id);if(!id)return null;
 const image=candidate(node.image_versions2?.candidates)||candidate(node.display_url?[{url:node.display_url,width:node.dimensions?.width,height:node.dimensions?.height}]:[]);
 const progressive=(Array.isArray(node.video_versions)?node.video_versions:[]).filter(value=>object(value)&&validInstagramCdnUrl(value.url));
 const video=candidate(progressive)||candidate(node.video_url?[{url:node.video_url,width:node.dimensions?.width,height:node.dimensions?.height}]:[])||(progressive[0]&&image?{...progressive[0],width:image.width,height:image.height}:null);
 if((node.media_type===2||node.is_video===true||node.__typename==='GraphVideo')&&!video)return null;
 const source=video||image;if(!source)return null;
 return{id,kind:video?'video':'photograph',url:source.url,width:Math.round(source.width),height:Math.round(source.height),poster:video&&image?image.url:null,hasAudio:typeof node.has_audio==='boolean'?node.has_audio:null,duration:typeof node.video_duration==='number'&&Number.isFinite(node.video_duration)&&node.video_duration>0?node.video_duration:null};
}
/** Only browser-visible JSON data belonging to the exact account, never arbitrary page URLs. */
export function extractPublicInstagramPosts(input){
 const found=new Map();let visited=0;const seen=new Set();
 function visit(value,depth=0){if(depth>80||++visited>100000||!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
  const username=value.user?.username||value.owner?.username,code=value.code||value.shortcode,id=sourceId(value.pk)||sourceId(value.id);
  if(username===INSTAGRAM_ACCOUNT&&id&&typeof code==='string'&&/^[A-Za-z0-9_-]{5,40}$/.test(code)){
   const children=Array.isArray(value.carousel_media)?value.carousel_media:Array.isArray(value.edge_sidecar_to_children?.edges)?value.edge_sidecar_to_children.edges.map(x=>x?.node):null;
   const sidecar=value.edge_sidecar_to_children,count=value.carousel_media_count??sidecar?.count;
   const carousel=value.media_type===8||value.__typename==='GraphSidecar'||children!==null;
   const complete=!carousel||(children&&Number.isSafeInteger(count)&&count>0&&count<=100&&children.length===count&&sidecar?.page_info?.has_next_page!==true&&value.more_available!==true);
   const assets=complete?(children||[value]).slice(0,100).map(mediaAsset):[];
   // Never mark a partially available carousel complete.
   if(assets.length&&assets.every(Boolean)){
    const caption=typeof value.caption?.text==='string'?value.caption.text:typeof value.edge_media_to_caption?.edges?.[0]?.node?.text==='string'?value.edge_media_to_caption.edges[0].node.text:'';
    if(caption.length<=20000){const time=value.taken_at??value.taken_at_timestamp;found.set(id,{id,code,caption,permalink:'https://www.instagram.com/p/'+code+'/',timestamp:Number.isSafeInteger(time)&&time>0&&time<=8640000000000?new Date(time*1000).toISOString():null,assets})}
   }
   return;
  }
  for(const child of Object.values(value))if(child&&typeof child==='object')visit(child,depth+1);
 }
 visit(input);return[...found.values()];
}
function archiveAsset(asset,poster=false){return object(asset)&&typeof asset.id==='string'&&/^ig-[0-9_]{5,81}-[a-f0-9]{16}$/.test(asset.id)&&['photograph','video'].includes(asset.kind)&&(!poster||asset.kind==='photograph')&&typeof asset.sha256==='string'&&/^[a-f0-9]{64}$/.test(asset.sha256)&&asset.id.endsWith(asset.sha256.slice(0,16))&&typeof asset.file==='string'&&new RegExp('^'+asset.id+'\\.'+(asset.kind==='video'?'mp4':'(?:jpg|png|webp)')+'$').test(asset.file)&&typeof asset.release==='string'&&/^instagram-media(?:-\d{6,30})?$/.test(asset.release)&&Number.isSafeInteger(asset.bytes)&&asset.bytes>0&&asset.bytes<2*1024**3&&Number.isSafeInteger(asset.width)&&asset.width>0&&asset.width<=16000&&Number.isSafeInteger(asset.height)&&asset.height>0&&asset.height<=16000&&(!asset.poster||(!poster&&archiveAsset(asset.poster,true)))}
export function validateInstagramArchive(value){
 if(!object(value)||value.version!==1||value.account!==INSTAGRAM_ACCOUNT||!Array.isArray(value.posts)||value.posts.length>10000)return false;
 const ids=new Set();return value.posts.every(post=>{if(!object(post)||!sourceId(post.id)||ids.has(post.id)||typeof post.caption!=='string'||post.caption.length>20000||typeof post.code!=='string'||!/^[A-Za-z0-9_-]{5,40}$/.test(post.code)||post.permalink!=='https://www.instagram.com/p/'+post.code+'/'||typeof post.published!=='boolean'||!['review','general','adult'].includes(post.audience)||!Array.isArray(post.assets)||!post.assets.length||post.assets.length>100||!post.assets.every(asset=>archiveAsset(asset)))return false;ids.add(post.id);return true});
}
export function githubInstagramAssetUrl(asset){if(!archiveAsset(asset))throw Error('invalid_archive_asset');return'https://github.com/'+INSTAGRAM_REPOSITORY+'/releases/download/'+asset.release+'/'+asset.file}
export function publishedInstagramAssets(archive){if(!validateInstagramArchive(archive))return[];return archive.posts.filter(post=>post.published&&post.audience==='general').flatMap(post=>post.assets.map(asset=>({...asset,postId:post.id,caption:post.caption,permalink:post.permalink,timestamp:post.timestamp||null}))) }
export function publicInstagramProjection(value){
 if(!validateInstagramArchive(value))return null;
 const file=asset=>({id:asset.id,kind:asset.kind,width:asset.width,height:asset.height,bytes:asset.bytes,sha256:asset.sha256,file:asset.file,release:asset.release,...(typeof asset.duration==='number'?{duration:asset.duration}:{}),...(asset.poster?{poster:file(asset.poster)}:{})});
 const posts=value.posts.filter(post=>post.published&&post.audience==='general').map(post=>({id:String(post.id),code:post.code,caption:post.caption,permalink:post.permalink,timestamp:typeof post.timestamp==='string'&&post.timestamp.length<40&&Number.isFinite(Date.parse(post.timestamp))?post.timestamp:null,published:true,audience:'general',assets:post.assets.map(file)}));
 const count=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000?x:0;
 return{version:1,account:INSTAGRAM_ACCOUNT,lastChecked:typeof value.lastChecked==='string'&&value.lastChecked.length<40&&Number.isFinite(Date.parse(value.lastChecked))?value.lastChecked:null,coverage:typeof value.coverage==='string'?value.coverage.slice(0,300):'Public posts only.',automation:{enabled:value.automation?.enabled===true,publishGeneral:value.automation?.publishGeneral===true},summary:{archived:count(value.summary?.archived)||value.posts.length,published:posts.length,failed:count(value.summary?.failed)},posts};
}
