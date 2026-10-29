import {createHash} from 'node:crypto';
import {merchProducts} from '@/data/color-blast';
import {db,qSchema} from './db';
import {ensureOpsSchema} from './ops';

export const COLOR_BLAST_ACTIVATION_SOURCE='owner-app-operations-20261028';
/** The owner approved the currently displayed STANDARD prices. Event prices
 * are deliberately absent from this exact activation payload. */
export const approvedColorBlastProducts=merchProducts.map(product=>({
 id:product.id,name:product.name,price:product.price,image:product.image,
 category:product.category,description:[product.description,...product.details,product.care].join('\n'),
 active:true,made_to_order:true,inventory_tracked:false,name_on_back_enabled:false,
 variants:product.variants.map(variant=>({product_id:product.id,label:variant.label,sku:variant.sku,price_adjustment:variant.priceAdjustment,active:true})),
}));
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const COLOR_BLAST_COLLECTION_HASH=hash(approvedColorBlastProducts);
type Manifest={version:1;mode:'owner_approved_color_blast_activation';phase:'preview'|'apply';request_id:string;requested_at:string;expires_at:string;source_request:typeof COLOR_BLAST_ACTIVATION_SOURCE;collection_hash:string;targets:{id:string;expected_absent:true}[]};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(value,key));
const instant=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value));

export function buildColorBlastActivationManifest({requestId,requestedAt,expiresAt}:{requestId:string;requestedAt:string;expiresAt:string}):Manifest{
 return {version:1,mode:'owner_approved_color_blast_activation',phase:'preview',request_id:requestId,requested_at:requestedAt,expires_at:expiresAt,source_request:COLOR_BLAST_ACTIVATION_SOURCE,collection_hash:COLOR_BLAST_COLLECTION_HASH,targets:approvedColorBlastProducts.map(product=>({id:product.id,expected_absent:true}))};
}
function manifestFor(raw:unknown):Manifest{
 if(!object(raw)||!exactKeys(raw,['version','mode','phase','request_id','requested_at','expires_at','source_request','collection_hash','targets'])||raw.version!==1||raw.mode!=='owner_approved_color_blast_activation'||!['preview','apply'].includes(String(raw.phase))||typeof raw.request_id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(raw.request_id)||!instant(raw.requested_at)||!instant(raw.expires_at)||raw.source_request!==COLOR_BLAST_ACTIVATION_SOURCE||raw.collection_hash!==COLOR_BLAST_COLLECTION_HASH||!Array.isArray(raw.targets)||raw.targets.length!==24)throw Error('invalid_color_blast_activation');
 const start=Date.parse(raw.requested_at),end=Date.parse(raw.expires_at);
 if(start>Date.now()+60000||end<=start||end-start>6*3600000)throw Error('invalid_color_blast_activation_validity');
 const targets=new Set<string>();
 for(const target of raw.targets){if(!object(target)||!exactKeys(target,['id','expected_absent'])||target.expected_absent!==true||typeof target.id!=='string'||targets.has(target.id)||!approvedColorBlastProducts.some(product=>product.id===target.id))throw Error('invalid_color_blast_activation_target');targets.add(target.id);}
 // Stable target order means equivalent manifests have the same journal identity.
 return {...raw,targets:approvedColorBlastProducts.map(product=>({id:product.id,expected_absent:true}))} as Manifest;
}
let journalReady:Promise<void>|null=null;
async function ensureJournal(){
 await ensureOpsSchema();
 if(!journalReady)journalReady=qSchema(`CREATE TABLE IF NOT EXISTS color_blast_activation_requests (
  request_id TEXT PRIMARY KEY,manifest_hash TEXT NOT NULL,collection_hash TEXT NOT NULL,
  manifest JSONB NOT NULL,products JSONB NOT NULL,
  actor TEXT NOT NULL DEFAULT 'owner-authorized-operator',created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`).catch(error=>{journalReady=null;throw error;});
 await journalReady;
}
/** Only called by the existing authenticated cron with operator-private input.
 * New identities only: no UPDATE/UPSERT of product/variant rows, no stock moves,
 * no financial/provider/message calls. The batch and immutable receipt commit
 * together. Replaying a receipt never restores a later staff edit. */
export async function applyColorBlastActivation(raw:unknown){
 const manifest=manifestFor(raw),digest=hash({...manifest,phase:'apply'});
 const outcome={request_id:manifest.request_id,manifest_hash:digest,expired:false,eligible:0,activated:0,already:0,conflicts:0};
 if(Date.parse(manifest.expires_at)<=Date.now())return {...outcome,expired:true};
 await ensureJournal();const pool=db();if(!pool)throw Error('db_not_configured');
 const client=await pool.connect().catch(async error=>{await pool.end();throw error;});
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['owner-color-blast-activation-v1']);
  const valid=async()=>{const result=await client.query<{valid:boolean}>('SELECT clock_timestamp() < $1::timestamptz AS valid',[manifest.expires_at]);return result.rows[0]?.valid===true;};
  if(!await valid()){await client.query('ROLLBACK');return {...outcome,expired:true};}
  const registered=await client.query<{request_id:string;manifest_hash:string;collection_hash:string}>('SELECT request_id,manifest_hash,collection_hash FROM color_blast_activation_requests WHERE request_id=$1',[manifest.request_id]);
  if(registered.rows.length){await client.query('ROLLBACK');return registered.rows[0].manifest_hash===digest?{...outcome,already:24}:{...outcome,conflicts:24};}
  const ids=manifest.targets.map(target=>target.id);
  const existing=await client.query('SELECT id FROM products WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[ids]);
  const variants=await client.query('SELECT product_id FROM merch_variants WHERE product_id=ANY($1::text[]) ORDER BY product_id FOR UPDATE',[ids]);
  if(existing.rows.length||variants.rows.length){await client.query('ROLLBACK');return {...outcome,conflicts:24};}
  if(manifest.phase==='preview'){await client.query('ROLLBACK');return {...outcome,eligible:24};}
  const products=approvedColorBlastProducts.map(({variants:_variants,...product})=>product);
  const inserted=await client.query(`INSERT INTO products(id,name,price,image,category,description,active,made_to_order,inventory_tracked,name_on_back_enabled)
   SELECT id,name,price,image,category,description,active,made_to_order,inventory_tracked,name_on_back_enabled
   FROM jsonb_to_recordset($1::jsonb) AS p(id text,name text,price int,image text,category text,description text,active boolean,made_to_order boolean,inventory_tracked boolean,name_on_back_enabled boolean)
   RETURNING id`,[JSON.stringify(products)]);
  if(inserted.rows.length!==24)throw Error('color_blast_activation_incomplete');
  await client.query(`INSERT INTO merch_variants(product_id,label,sku,price_adjustment,active)
   SELECT product_id,label,sku,price_adjustment,active FROM jsonb_to_recordset($1::jsonb) AS v(product_id text,label text,sku text,price_adjustment int,active boolean)`,[JSON.stringify(approvedColorBlastProducts.flatMap(product=>product.variants))]);
  if(!await valid()){await client.query('ROLLBACK');return {...outcome,expired:true};}
  await client.query(`INSERT INTO color_blast_activation_requests(request_id,manifest_hash,collection_hash,manifest,products) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)`,[manifest.request_id,digest,COLOR_BLAST_COLLECTION_HASH,JSON.stringify(manifest),JSON.stringify(approvedColorBlastProducts)]);
  await client.query('COMMIT');return {...outcome,eligible:24,activated:24};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')return {...outcome,conflicts:24};throw error;}
 finally{client.release();await pool.end();}
}
