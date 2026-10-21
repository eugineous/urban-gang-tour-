import {createHash} from 'node:crypto';
import {q} from './db';
import {ensureEditorialSchema} from './editorial-schema';
import {articleParagraphs,editorialAsset,editorialReview,type EditorialBundle,type EditorialItem} from '../editorial-import';
import {mediaGet} from './media';
import {PUBLIC_POST_PREDICATE} from './editorial-publication';

function canonical(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
  return value;
}
export const itemHash=(item:EditorialItem)=>createHash('sha256').update(JSON.stringify(canonical(item))).digest('hex');
export const itemRecord=(item:EditorialItem,sourceHash:string)=>({
  ...item,hash:itemHash(item),body:item.kind==='article'?articleParagraphs(item.markdown):[],
  source:{...item,metadata:{...item.metadata,source_sha256:sourceHash}},
});

/** A retry is harmless; a conflicting slug/date is reported and NEVER overwritten. */
export async function importEditorial(bundle:EditorialBundle,actor:string,preview:boolean){
  await ensureEditorialSchema();
  const items=bundle.items.map(item=>itemRecord(item,bundle.source_sha256));
  // The original private ZIP remains recoverable. Once an exact assignment
  // has been completed, retrying its original import must neither conflict
  // forever nor recreate a brief after an editor deletes the finished story.
  const receipts=await q<{slug:string;original_hash:string}>(`SELECT slug,detail->>'original_hash' AS original_hash FROM editorial_audit WHERE action='complete_owner_analysis' AND detail->>'original_source_sha256'=$1 AND slug=ANY($2::text[])`,[bundle.source_sha256,items.map(item=>item.slug)]);
  const superseded=(item:typeof items[number])=>item.kind==='assignment'&&receipts.some(row=>row.slug===item.slug&&row.original_hash===item.hash);
  const active=items.filter(item=>!superseded(item));
  const existing=await q<{slug:string;date:string;editorial_import_hash:string|null}>(
    `SELECT slug,date::text,editorial_import_hash FROM posts WHERE slug=ANY($1::text[]) OR (editorial_managed AND date=ANY($2::date[]))`,[items.map(i=>i.slug),items.map(i=>i.date)]);
  const classifications=()=>items.map(item=>{
    const match=existing.find(row=>row.slug===item.slug||row.date===item.date);
    return {slug:item.slug,kind:item.kind,scheduled_at:item.scheduled_at,state:superseded(item)?'superseded':!match?'new':match.slug===item.slug&&match.editorial_import_hash===item.hash?'unchanged':'conflict'};
  });
  if(preview)return {preview:true,items:classifications()};
  // One statement atomically records new drafts plus the audit trail. Conflicts
  // may be concurrent; report the final inventory rather than assuming success.
  const inserted=await q<{slug:string}>(`WITH incoming AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(slug text,date text,scheduled_at text,title text,section text,description text,kind text,hash text,body jsonb,source jsonb)
  ), saved AS (
    INSERT INTO posts(slug,headline,section,dek,body,image,published,date,editorial_status,submitted_by,
      editorial_managed,editorial_kind,scheduled_at,editorial_import_hash,editorial_source,social_automation_enabled)
    SELECT slug,title,section,description,body,'',false,date::date,CASE WHEN kind='article' THEN 'drafted' ELSE 'researching' END,$2,
      true,kind,scheduled_at::timestamptz,hash,source,false FROM incoming
    ON CONFLICT DO NOTHING RETURNING slug
  ), audit AS (
    INSERT INTO editorial_audit(actor,action,slug,detail)
    SELECT $2,'import_draft',slug,jsonb_build_object('source_sha256',$3::text) FROM saved RETURNING id
  ) SELECT slug FROM saved`,[JSON.stringify(active),actor,bundle.source_sha256]);
  const final=await q<{slug:string;editorial_import_hash:string}>(`SELECT slug,editorial_import_hash FROM posts WHERE slug=ANY($1::text[])`,[items.map(i=>i.slug)]);
  return {preview:false,inserted:inserted.length,unchanged:active.filter(item=>!inserted.some(r=>r.slug===item.slug)&&final.some(r=>r.slug===item.slug&&r.editorial_import_hash===item.hash)).length,superseded:items.length-active.length,
    conflicts:active.filter(item=>!final.some(r=>r.slug===item.slug&&r.editorial_import_hash===item.hash)).map(i=>i.slug)};
}

export function webpDimensions(bytes:ArrayBuffer):{width:number;height:number}|null{
  const b=Buffer.from(bytes);
  if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP'||b.readUInt32LE(4)+8!==b.length)return null;
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8X')return {width:1+b.readUIntLE(24,3),height:1+b.readUIntLE(27,3)};
  if(kind==='VP8 '&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a)return {width:b.readUInt16LE(26)&0x3fff,height:b.readUInt16LE(28)&0x3fff};
  if(kind==='VP8L'&&b[20]===0x2f){const bits=b.readUInt32LE(21);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1}}
  return null;
}

export async function verifyEditorialImages(raw:unknown){
  const assets=editorialAsset(raw);
  for(const [url,width,height] of [[assets.hero,1600,900],[assets.og,1200,630]] as const){
    const image=await mediaGet(url);
    if(!image||image.metadata.contentType!=='image/webp')throw Error('image_missing');
    const dimensions=webpDimensions(image.value);
    if(!dimensions||dimensions.width!==width||dimensions.height!==height)throw Error('image_dimensions_required');
  }
  return assets;
}

/** The explicit verified-owner attestation is not an automated fact-check claim. */
export async function reviewEditorial(slug:string,revision:number,actor:string,rawReview:unknown,rawAssets:unknown){
  await ensureEditorialSchema();
  const review=editorialReview(rawReview),assets=await verifyEditorialImages(rawAssets);
  const rows=await q<{editorial_source:EditorialItem;editorial_import_hash:string;headline:string}>(
    `SELECT editorial_source,editorial_import_hash,headline FROM posts WHERE slug=$1 AND editorial_managed AND editorial_revision=$2 AND editorial_kind='article' AND NOT published`,[slug,revision]);
  if(!rows.length)throw Error('editorial_conflict');
  const item=rows[0].editorial_source;
  if(articleParagraphs(item.markdown).join(' ').split(/\s+/).length<400||/## Proposed structure|\*\*Reporting assignment:/.test(item.markdown))throw Error('incomplete_article');
  // Surface exact near-duplicate title/body matches; an operator must revise
  // before approval. This is deterministic screening, not semantic originality certification.
  const duplicate=await q(`SELECT slug FROM posts WHERE slug<>$1 AND (lower(headline)=lower($2) OR (body=$3::jsonb AND jsonb_array_length(body)>0)) LIMIT 1`,[slug,item.title,JSON.stringify(articleParagraphs(item.markdown))]);
  if(duplicate.length)throw Error('duplicate_article');
  return q<{slug:string}>(`WITH saved AS (
    UPDATE posts SET published=true,editorial_status='approved_for_auto_release',
      published_at=CASE WHEN scheduled_at<=now() THEN now() ELSE NULL END,
      editorial_review=$4::jsonb||jsonb_build_object('approved_revision',editorial_revision::text,'approved_hash',editorial_import_hash,'approved_by',$3::text,'approved_at',now()),
      asset_manifest=$5::jsonb,image=$5::jsonb->>'hero',reviewed_by=$3,reviewed_at=now(),updated_at=now(),social_automation_enabled=false
    WHERE slug=$1 AND editorial_managed AND editorial_kind='article' AND editorial_revision=$2 AND NOT published
      AND editorial_import_hash=$6 RETURNING slug,editorial_review,asset_manifest
  ), audit AS (
    INSERT INTO editorial_audit(actor,action,slug,detail) SELECT $3,'approve_schedule',slug,jsonb_build_object('revision',$2::int,'review',editorial_review,'assets',asset_manifest) FROM saved RETURNING id
  ) SELECT slug FROM saved`,[slug,revision,actor,JSON.stringify(review),JSON.stringify(assets),rows[0].editorial_import_hash]);
}

export async function holdEditorial(slug:string,revision:number,actor:string){
  await ensureEditorialSchema();
  return q<{slug:string}>(`WITH saved AS (
    UPDATE posts SET published=false,editorial_status='blocked',editorial_review='{}'::jsonb,
      editorial_revision=editorial_revision+1,updated_at=now(),social_automation_enabled=false
    WHERE slug=$1 AND editorial_managed AND editorial_revision=$2 RETURNING slug
  ), audit AS (
    INSERT INTO editorial_audit(actor,action,slug) SELECT $3,'hold',slug FROM saved RETURNING id
  ) SELECT slug FROM saved`,[slug,revision,actor]);
}

export async function updateEditorial(item:EditorialItem,revision:number,actor:string){
  await ensureEditorialSchema();
  return q<{slug:string}>(`WITH saved AS (
    UPDATE posts SET headline=$3,section=$4,dek=$5,body=$6::jsonb,editorial_source=$7::jsonb,
      scheduled_at=$8::timestamptz,date=$9::date,editorial_kind=$10,editorial_import_hash=$11,
      published=false,editorial_status=CASE WHEN $10='article' THEN 'drafted' ELSE 'researching' END,
      editorial_review='{}'::jsonb,editorial_revision=editorial_revision+1,updated_at=now(),social_automation_enabled=false
    WHERE slug=$1 AND editorial_managed AND editorial_revision=$2 AND NOT published AND published_at IS NULL
    RETURNING slug
  ), audit AS (
    INSERT INTO editorial_audit(actor,action,slug) SELECT $12,'edit_draft',slug FROM saved RETURNING id
  ) SELECT slug FROM saved`,[item.slug,revision,item.title,item.section,item.description,JSON.stringify(item.kind==='article'?articleParagraphs(item.markdown):[]),JSON.stringify(item),item.scheduled_at,item.date,item.kind,itemHash(item),actor]);
}

/** Visibility is timestamp-based, not quarter-hour cron based. Cron records/monitors it. */
export async function releaseDueEditorial(){
  await ensureEditorialSchema();
  const released=await q<{slug:string}>(`WITH saved AS (
    UPDATE posts SET editorial_status='live',published_at=COALESCE(published_at,scheduled_at)
    WHERE editorial_managed AND editorial_status='approved_for_auto_release' AND ${PUBLIC_POST_PREDICATE}
    RETURNING slug
  ), audit AS (
    INSERT INTO editorial_audit(actor,action,slug) SELECT 'scheduler','released',slug FROM saved RETURNING id
  ) SELECT slug FROM saved`);
  await q(`INSERT INTO editorial_monitor(id,checked_at,released) VALUES(1,now(),$1) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,released=excluded.released`,[released.length]);
  const held=await q<{count:string}>(`SELECT count(*)::text AS count FROM posts WHERE editorial_managed AND scheduled_at<=now() AND NOT (${PUBLIC_POST_PREDICATE})`);
  return {released:released.length,held:Number(held[0]?.count||0)};
}
