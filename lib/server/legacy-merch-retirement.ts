import {createHash} from 'node:crypto';
import {legacyMerchRetirementManifest} from '../legacy-merch-retirement';
import {q,qSchema} from './db';
import {ensureOpsSchema} from './ops';

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}

let journalReady:Promise<void>|null=null;
async function ensureRetirementJournal(){
 await ensureOpsSchema();
 if(!journalReady)journalReady=qSchema(`
  CREATE UNIQUE INDEX IF NOT EXISTS audit_legacy_merch_retirement_request_id
   ON audit_log ((detail->>'request_id')) WHERE action='legacy_merch_retirement_request';
  CREATE UNIQUE INDEX IF NOT EXISTS audit_legacy_merch_retirement_product_once
   ON audit_log ((detail->>'request_id'),(detail->>'product_id')) WHERE action='retire_legacy_merch_product';
 `).catch(error=>{journalReady=null;throw error;});
 await journalReady;
}

/** Existing authenticated cron only, with an expiring operator-private manifest.
 * Retires the approved legacy identities without touching stock, prices or
 * accepted orders. Request identity, before-record receipts and the complete
 * batch update commit together; no later restoration can replay this request.
 */
export async function applyLegacyMerchRetirement(raw:unknown){
 const manifest=legacyMerchRetirementManifest(raw);
 const digest=createHash('sha256').update(JSON.stringify(canonical(manifest))).digest('hex');
 const outcome={request_id:manifest.request_id,manifest_hash:digest,expired:false,retired:0,already:0,conflicts:0};
 const expires=Date.parse(manifest.expires_at),total=manifest.targets.length;
 if(expires<=Date.now())return {...outcome,expired:true};
 await ensureRetirementJournal();
 const registered=await q<{manifest_hash:string}>(`SELECT detail->>'manifest_hash' AS manifest_hash FROM audit_log WHERE action='legacy_merch_retirement_request' AND detail->>'request_id'=$1`,[manifest.request_id]);
 if(registered.length&&registered[0].manifest_hash!==digest)return {...outcome,conflicts:total};
 const readReceipts=()=>q<{product_id:string}>(`SELECT detail->>'product_id' AS product_id FROM audit_log
  WHERE action='retire_legacy_merch_product' AND detail->>'request_id'=$1 AND detail->>'manifest_hash'=$2
   AND detail->>'product_id'=ANY($3::text[])`,[manifest.request_id,digest,manifest.targets.map(target=>target.id)]);
 if((await readReceipts()).length===total)return {...outcome,already:total};

 const saved=await q<{id:string}>(`WITH incoming AS (
   SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,expected_image text,expected_name text,expected_price numeric)
  ), registered AS (
   INSERT INTO audit_log(actor,action,detail)
   SELECT 'owner-authorized-operator','legacy_merch_retirement_request',jsonb_build_object(
    'request_id',$2::text,'manifest_hash',$3::text,'source_request',$6::text,'requested_at',$4::text,'expires_at',$5::text)
   WHERE $5::timestamptz>clock_timestamp()
   ON CONFLICT ((detail->>'request_id')) WHERE action='legacy_merch_retirement_request' DO NOTHING RETURNING id
  ), permitted AS (
   SELECT id FROM registered UNION ALL
   SELECT id FROM audit_log WHERE action='legacy_merch_retirement_request' AND detail->>'request_id'=$2 AND detail->>'manifest_hash'=$3
  ), locked AS MATERIALIZED (
   SELECT products.id,to_jsonb(products) AS before_record
   FROM products JOIN incoming i ON i.id=products.id
   WHERE EXISTS(SELECT 1 FROM permitted)
    AND products.active=true AND products.image=i.expected_image AND products.name=i.expected_name AND products.price=i.expected_price
    AND products.created_at IS NOT NULL AND products.updated_at IS NOT NULL
    AND products.created_at<=$4::timestamptz AND products.updated_at<=$4::timestamptz
    AND NOT EXISTS(SELECT 1 FROM audit_log a WHERE a.action='retire_legacy_merch_product' AND a.detail->>'request_id'=$2)
   ORDER BY products.id FOR UPDATE OF products
  ), gate AS MATERIALIZED (
   SELECT count(*) AS n,clock_timestamp() AS checked_at FROM locked
  ), saved AS (
   UPDATE products SET active=false,updated_at=clock_timestamp()
   FROM locked l WHERE products.id=l.id AND to_jsonb(products)=l.before_record
    AND (SELECT n=(SELECT count(*) FROM incoming) AND checked_at<$5::timestamptz FROM gate)
   RETURNING products.id,products.updated_at,l.before_record
  ), audit AS (
   INSERT INTO audit_log(actor,action,detail)
   SELECT 'owner-authorized-operator','retire_legacy_merch_product',jsonb_build_object(
    'request_id',$2::text,'manifest_hash',$3::text,'source_request',$6::text,
    'product_id',id,'previous_record',before_record,'updated_at',updated_at)
   FROM saved RETURNING id
  ) SELECT id FROM saved`,[
   JSON.stringify(manifest.targets),manifest.request_id,digest,manifest.requested_at,manifest.expires_at,manifest.source_request,
  ]);
 const receipts=await readReceipts();
 return {...outcome,expired:saved.length===0&&expires<=Date.now(),retired:saved.length,already:Math.max(0,receipts.length-saved.length),conflicts:Math.max(0,total-receipts.length)};
}
