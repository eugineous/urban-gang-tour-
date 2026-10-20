import {q} from './db';
import {ensureEditorialSchema} from './editorial-schema';
import {ownerEditorialApproval} from '../owner-editorial-approval';

/** Called only by the existing authenticated cron with operator-private KV input.
 * Hash/revision/series scoped, expiring, journalled and non-replayable after hold.
 * Never impersonates a session or claims independently verified facts.
 */
export async function applyOwnerEditorialApproval(raw:unknown){
 const approval=ownerEditorialApproval(raw);
 if(Date.parse(approval.expires_at)<=Date.now())return {expired:true,approved:0,already:0,conflicts:0};
 await ensureEditorialSchema();
 const assets={hero:'/assets/ugt-logo.png',og:'/assets/ugt-logo.png',alt:'Urban Gang Tour logo',caption:'Urban News editorial guide.',rights:'Existing owner-supplied website brand asset',provenance:'Existing /assets/ugt-logo.png; brand mark, not event photography',illustration:false};
 const review={mode:'owner_approved_analysis',facts_checked:false,verification_status:'not_independently_fact_checked',source_request:approval.source_request,request_id:approval.request_id,
   disclosure:'Analysis and practical guidance. Confirm current institutional policies and requirements before acting.'};
 const saved=await q<{slug:string}>(`WITH targets AS (
   SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(slug text,hash text,revision integer)
 ), approved AS (
   UPDATE posts SET published=true,editorial_status='approved_for_auto_release',
     published_at=CASE WHEN posts.scheduled_at<=now() THEN now() ELSE NULL END,
     editorial_review=$4::jsonb||jsonb_build_object('approved_revision',posts.editorial_revision::text,'approved_hash',posts.editorial_import_hash,'approved_by','owner-authorized-operator','approved_at',now()),
     asset_manifest=$5::jsonb,image='/assets/ugt-logo.png',reviewed_by='owner-authorized-operator',reviewed_at=now(),updated_at=now(),social_automation_enabled=false
   FROM targets WHERE posts.slug=targets.slug AND posts.editorial_managed AND posts.editorial_kind='article'
     AND posts.editorial_status IN ('drafted','draft') AND NOT posts.published AND posts.published_at IS NULL
     AND posts.editorial_revision=targets.revision AND posts.editorial_import_hash=targets.hash
     AND posts.editorial_source->'metadata'->>'source_sha256'=$2
     AND posts.editorial_source->'metadata'->>'editorial_type'='Analysis / practical guide'
     AND jsonb_array_length(posts.body)>0
     AND NOT EXISTS(SELECT 1 FROM editorial_audit WHERE editorial_audit.slug=posts.slug AND action='owner_approve_analysis' AND detail->>'request_id'=$3)
   RETURNING posts.slug,posts.editorial_review,posts.asset_manifest
 ), audit AS (
   INSERT INTO editorial_audit(actor,action,slug,detail)
   SELECT 'owner-authorized-operator','owner_approve_analysis',slug,jsonb_build_object('request_id',$3::text,'source_sha256',$2::text,'review',editorial_review,'assets',asset_manifest) FROM approved RETURNING id
 ) SELECT slug FROM approved`,[JSON.stringify(approval.targets),approval.source_sha256,approval.request_id,JSON.stringify(review),JSON.stringify(assets)]);
 const receipts=await q<{slug:string}>(`SELECT slug FROM editorial_audit WHERE action='owner_approve_analysis' AND detail->>'request_id'=$1 AND slug=ANY($2::text[])`,[approval.request_id,approval.targets.map(i=>i.slug)]);
 const processed=new Set(receipts.map(i=>i.slug));
 return {expired:false,approved:saved.length,already:processed.size-saved.length,conflicts:approval.targets.filter(i=>!processed.has(i.slug)).length};
}
