import {createHash} from 'node:crypto';
import {editorialCompletion,type EditorialCompletion} from '../editorial-completion';
import {itemRecord} from './editorial';
import {q,qSchema} from './db';
import {ensureEditorialSchema} from './editorial-schema';

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)]));
 return value;
}
export const completionHash=(manifest:EditorialCompletion)=>createHash('sha256').update(JSON.stringify(canonical(manifest))).digest('hex');
let ready:Promise<void>|null=null;
async function ensureCompletionJournal(){
 await ensureEditorialSchema();
 if(!ready)ready=qSchema(`CREATE UNIQUE INDEX IF NOT EXISTS editorial_completion_request_id ON editorial_audit ((detail->>'request_id')) WHERE action='completion_request'`).catch(error=>{ready=null;throw error});
 await ready;
}

/** Existing authenticated cron only, using operator-private, expiring input.
 * This is an exact assignment-to-analysis conversion, never an admin login,
 * arbitrary content patch, independent fact-check certificate or raw brief release.
 */
export async function applyEditorialCompletion(raw:unknown){
 const manifest=editorialCompletion(raw),digest=completionHash(manifest);
 const identity={request_id:manifest.request_id,source_sha256:manifest.bundle.source_sha256,manifest_hash:digest};
 if(Date.parse(manifest.expires_at)<=Date.now())return {...identity,expired:true,completed:0,already:0,conflicts:0};
 await ensureCompletionJournal();
 const targets=new Map(manifest.targets.map(target=>[target.slug,target]));
 const incoming=manifest.bundle.items.map(item=>({...itemRecord(item,manifest.bundle.source_sha256),expected_hash:targets.get(item.slug)!.hash,expected_revision:targets.get(item.slug)!.revision}));
 const assets={hero:'/assets/ugt-logo.png',og:'/assets/ugt-logo.png',alt:'Urban Gang Tour logo',caption:'Urban News editorial guide.',rights:'Existing owner-supplied website brand asset',provenance:'Existing /assets/ugt-logo.png; brand mark, not event photography',illustration:false};
 const review={mode:'owner_approved_analysis',facts_checked:false,verification_status:'not_independently_fact_checked',source_request:manifest.source_request,request_id:manifest.request_id,
  disclosure:'Analysis and practical guidance. Confirm current institutional policies and requirements before acting.'};
 const saved=await q<{slug:string}>(`WITH incoming AS (
   SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(slug text,date text,scheduled_at text,title text,section text,description text,kind text,hash text,body jsonb,source jsonb,expected_hash text,expected_revision integer)
 ), registered AS (
   INSERT INTO editorial_audit(actor,action,slug,detail)
   SELECT 'owner-authorized-operator','completion_request','editorial-library',jsonb_build_object('request_id',$2::text,'manifest_hash',$3::text,'original_source_sha256',$4::text,'completed_source_sha256',$5::text)
   WHERE $8::timestamptz>now()
   ON CONFLICT ((detail->>'request_id')) WHERE action='completion_request' DO NOTHING RETURNING id
 ), permitted AS (
   SELECT id FROM registered UNION ALL
   SELECT id FROM editorial_audit WHERE action='completion_request' AND detail->>'request_id'=$2 AND detail->>'manifest_hash'=$3
 ), locked AS MATERIALIZED (
   SELECT p.slug,p.editorial_source AS original_source,p.editorial_import_hash AS original_hash,p.editorial_revision AS original_revision
   FROM posts p JOIN incoming i ON i.slug=p.slug
   WHERE EXISTS(SELECT 1 FROM permitted) AND $8::timestamptz>now()
     AND p.editorial_managed AND p.editorial_kind='assignment' AND p.editorial_status='researching'
     AND NOT p.published AND p.published_at IS NULL
     AND p.editorial_revision=i.expected_revision AND p.editorial_import_hash=i.expected_hash
     AND p.editorial_source->'metadata'->>'source_sha256'=$4
     AND p.date=i.date::date AND p.scheduled_at=i.scheduled_at::timestamptz
     AND (SELECT count(*) FROM editorial_audit a WHERE a.action='import_draft' AND a.slug=p.slug AND a.detail->>'source_sha256'=$4)=1
     AND NOT EXISTS(SELECT 1 FROM editorial_audit a WHERE a.action='complete_owner_analysis' AND a.slug=p.slug AND a.detail->>'original_hash'=i.expected_hash AND a.detail->>'original_source_sha256'=$4)
   ORDER BY p.slug FOR UPDATE OF p
 ), completed AS (
   UPDATE posts p SET headline=i.title,section=i.section,dek=i.description,body=i.body,
     image='/assets/ugt-logo.png',editorial_kind='article',editorial_source=i.source,
     editorial_import_hash=i.hash,editorial_revision=p.editorial_revision+1,
     editorial_status='approved_for_auto_release',published=true,
     published_at=CASE WHEN p.scheduled_at<=now() THEN now() ELSE NULL END,
     editorial_review=$6::jsonb||jsonb_build_object('approved_revision',(p.editorial_revision+1)::text,'approved_hash',i.hash,'approved_by','owner-authorized-operator','approved_at',now()),
     asset_manifest=$7::jsonb,reviewed_by='owner-authorized-operator',reviewed_at=now(),updated_at=now(),social_automation_enabled=false
   FROM incoming i JOIN locked l ON l.slug=i.slug WHERE p.slug=l.slug
     AND p.editorial_revision=i.expected_revision AND p.editorial_import_hash=i.expected_hash
     AND p.editorial_kind='assignment' AND p.editorial_status='researching' AND NOT p.published AND p.published_at IS NULL
   RETURNING p.slug,p.editorial_revision,p.editorial_import_hash,p.editorial_source,p.editorial_review,p.asset_manifest,l.original_source,l.original_hash,l.original_revision
 ), audit AS (
   INSERT INTO editorial_audit(actor,action,slug,detail)
   SELECT 'owner-authorized-operator','complete_owner_analysis',slug,jsonb_build_object(
    'request_id',$2::text,'manifest_hash',$3::text,'original_source_sha256',$4::text,'completed_source_sha256',$5::text,
    'original_hash',original_hash,'original_revision',original_revision,'original_source',original_source,
    'completed_hash',editorial_import_hash,'completed_revision',editorial_revision,'completed_source',editorial_source,'review',editorial_review,'assets',asset_manifest)
   FROM completed RETURNING id
 ) SELECT slug FROM completed`,[JSON.stringify(incoming),manifest.request_id,digest,manifest.original_source_sha256,manifest.bundle.source_sha256,JSON.stringify(review),JSON.stringify(assets),manifest.expires_at]);
 const receipts=await q<{slug:string}>(`SELECT slug FROM editorial_audit WHERE action='complete_owner_analysis' AND detail->>'request_id'=$1 AND detail->>'manifest_hash'=$2 AND slug=ANY($3::text[])`,[manifest.request_id,digest,manifest.targets.map(target=>target.slug)]);
 const processed=new Set(receipts.map(row=>row.slug));
 return {...identity,expired:false,completed:saved.length,already:processed.size-saved.length,conflicts:manifest.targets.filter(target=>!processed.has(target.slug)).length};
}
