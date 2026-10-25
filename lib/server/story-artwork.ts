import {createHash} from 'node:crypto';
import {storyArtworkManifest,type StoryArtworkManifest} from '../story-artwork';
import {q,qSchema} from './db';
import {ensureEditorialSchema} from './editorial-schema';
import {PUBLIC_POST_PREDICATE} from './editorial-publication';
import {mediaGet,mediaKey} from './media';
import {webpDimensions} from './editorial';

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
 return value;
}
/** An opaque full-record version includes creation identity and all editorial state. */
export const storyArtworkVersion=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
let ready:Promise<void>|null=null;
async function ensureArtworkJournal(){
 await ensureEditorialSchema();
 if(!ready)ready=qSchema(`CREATE UNIQUE INDEX IF NOT EXISTS editorial_story_artwork_request_id ON editorial_audit ((detail->>'request_id')) WHERE action='story_artwork_request'`).catch(error=>{ready=null;throw error});
 await ready;
}
async function verifyArtwork(manifest:StoryArtworkManifest){
 for(const target of manifest.targets)for(const [url,width,height] of [[target.assets.hero,1600,900],[target.assets.og,1200,630]] as const){
  const image=await mediaGet(url),key=mediaKey(url);
  if(!image||!key||image.metadata.contentType!=='image/webp'||image.metadata.size!==image.value.byteLength)throw Error('story_artwork_image_invalid');
  const bytes=Buffer.from(image.value),dimensions=webpDimensions(image.value),hash=createHash('sha256').update(bytes).digest('hex');
  // This bounded release accepts simple still VP8 WebPs only. A canvas header
  // without a framed keyframe payload is not artwork. The operator separately
  // decodes the approved derivatives before staging their exact content hashes.
  const payload=bytes.length>=30?bytes.readUInt32LE(16):0;
  const partition=bytes.length>=30?bytes.readUIntLE(20,3)>>>5:0;
  const framed=bytes.length>=30&&bytes.toString('ascii',12,16)==='VP8 '&&payload>=11&&20+payload+(payload%2)===bytes.length&&(bytes[20]&1)===0&&((bytes[20]>>1)&7)<=3&&partition>0&&partition<=payload-10;
  if(!framed||!dimensions||dimensions.width!==width||dimensions.height!==height||key.split('/')[1]!==hash)throw Error('story_artwork_image_invalid');
 }
}

/** Only the existing secret-authenticated cron may call this with operator-private
 * KV input. Never approves content or changes text, schedules, status or review.
 * Preview returns opaque versions, not private story bodies. Apply is one atomic
 * image-only, full-record compare-and-swap plus a durable immutable audit receipt.
 */
export async function applyStoryArtwork(raw:unknown){
 const manifest=storyArtworkManifest(raw),digest=storyArtworkVersion(manifest);
 const identity={request_id:manifest.request_id,manifest_hash:digest};
 const outcome={...identity,preview:manifest.phase==='preview',expired:false,updated:0,already:0,conflicts:0};
 if(Date.parse(manifest.expires_at)<=Date.now())return {...outcome,expired:true};
 await ensureArtworkJournal();
 if(manifest.phase==='apply'){
  const registered=await q<{detail:{manifest_hash:string}}>(`SELECT detail FROM editorial_audit WHERE action='story_artwork_request' AND detail->>'request_id'=$1`,[manifest.request_id]);
  if(registered.length&&registered[0].detail.manifest_hash!==digest)return {...outcome,conflicts:manifest.targets.length};
  const receipts=await q<{slug:string}>(`SELECT slug FROM editorial_audit WHERE action='publish_story_artwork' AND detail->>'request_id'=$1 AND detail->>'manifest_hash'=$2 AND slug=ANY($3::text[])`,[manifest.request_id,digest,manifest.targets.map(target=>target.slug)]);
  if(receipts.length===manifest.targets.length)return {...outcome,already:receipts.length};
 }
 const records=await q<{record:Record<string,unknown>}>(`SELECT to_jsonb(posts) AS record FROM posts WHERE slug=ANY($1::text[]) AND ${PUBLIC_POST_PREDICATE}`,[manifest.targets.map(target=>target.slug)]);
 const inspected=manifest.targets.map(target=>{
  const record=records.find(row=>row.record.slug===target.slug)?.record;
  const matched=!!record&&record.image===target.expected_image&&record.headline===target.expected_headline&&record.date===target.expected_date;
  return {slug:target.slug,version:record?storyArtworkVersion(record):null,matched,record};
 });
 if(manifest.phase==='preview'){
  await verifyArtwork(manifest);
  return {...outcome,targets:inspected.map(({slug,version,matched})=>({slug,version,matched})),conflicts:inspected.filter(item=>!item.matched).length};
 }
 const conflicts=inspected.filter((item,index)=>!item.matched||item.version!==manifest.targets[index].expected_version).length;
 if(conflicts)return {...outcome,conflicts};
 await verifyArtwork(manifest);
 const incoming=manifest.targets.map((target,index)=>({...target,expected_record:inspected[index].record}));
 const saved=await q<{slug:string}>(`WITH incoming AS (
   SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(slug text,expected_record jsonb,assets jsonb)
 ), registered AS (
   INSERT INTO editorial_audit(actor,action,slug,detail)
   SELECT 'owner-authorized-operator','story_artwork_request','editorial-library',jsonb_build_object('request_id',$2::text,'manifest_hash',$3::text,'source_request',$5::text)
   WHERE $4::timestamptz>clock_timestamp()
   ON CONFLICT ((detail->>'request_id')) WHERE action='story_artwork_request' DO NOTHING RETURNING id
 ), permitted AS (
   SELECT id FROM registered UNION ALL
   SELECT id FROM editorial_audit WHERE action='story_artwork_request' AND detail->>'request_id'=$2 AND detail->>'manifest_hash'=$3
 ), locked AS MATERIALIZED (
   SELECT posts.slug,to_jsonb(posts) AS before_record
   FROM posts JOIN incoming i ON i.slug=posts.slug
   WHERE EXISTS(SELECT 1 FROM permitted) AND $4::timestamptz>clock_timestamp()
     AND to_jsonb(posts)=i.expected_record AND ${PUBLIC_POST_PREDICATE}
     AND NOT EXISTS(SELECT 1 FROM editorial_audit a WHERE a.action='publish_story_artwork' AND a.detail->>'request_id'=$2)
   ORDER BY posts.slug FOR UPDATE OF posts
 ), gate AS MATERIALIZED (
   SELECT count(*) AS n,clock_timestamp() AS checked_at FROM locked
 ), saved AS (
   UPDATE posts SET image=i.assets->>'hero',asset_manifest=i.assets,
     updated_at=GREATEST(clock_timestamp(),posts.updated_at+interval '1 microsecond')
   FROM incoming i JOIN locked l ON l.slug=i.slug
   WHERE posts.slug=i.slug AND to_jsonb(posts)=i.expected_record
     AND (SELECT n=(SELECT count(*) FROM incoming) AND checked_at<$4::timestamptz FROM gate)
   RETURNING posts.slug,posts.image,posts.asset_manifest,posts.updated_at,l.before_record
 ), audit AS (
   INSERT INTO editorial_audit(actor,action,slug,detail)
   SELECT 'owner-authorized-operator','publish_story_artwork',slug,jsonb_build_object(
     'request_id',$2::text,'manifest_hash',$3::text,'source_request',$5::text,
     'previous_record',before_record,'assets',asset_manifest,'updated_at',updated_at)
   FROM saved RETURNING id
 ) SELECT slug FROM saved`,[JSON.stringify(incoming),manifest.request_id,digest,manifest.expires_at,manifest.source_request]);
 const receipts=await q<{slug:string}>(`SELECT slug FROM editorial_audit WHERE action='publish_story_artwork' AND detail->>'request_id'=$1 AND detail->>'manifest_hash'=$2 AND slug=ANY($3::text[])`,[manifest.request_id,digest,manifest.targets.map(target=>target.slug)]);
 return {...outcome,updated:saved.length,already:receipts.length-saved.length,conflicts:manifest.targets.length-receipts.length};
}
