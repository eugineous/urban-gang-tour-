import {db,qSchema} from './db';
import {createHash} from 'node:crypto';

// This is an application ceiling, not a claim of unlimited free hosting.
// Existing records are retained even when they already exceed this budget.
export const MEDIA_STORAGE_LIMIT=500*1024*1024;
export const MEDIA_DAILY_WRITES=100;
export type MediaInventory=()=>Promise<{key:string;bytes:number}[]>;
export const mediaBudgetKey=(key:string)=>createHash('sha256').update(key).digest('hex');
let ready:Promise<void>|undefined;
const schema=`CREATE TABLE IF NOT EXISTS media_storage_budget(
 id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id), initialized BOOLEAN NOT NULL DEFAULT false,
 writes INT NOT NULL DEFAULT 0, window_started_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS media_storage_objects(
 key_hash TEXT PRIMARY KEY CHECK(key_hash ~ '^[a-f0-9]{64}$'), bytes BIGINT NOT NULL CHECK(bytes>0),
 stored BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS media_storage_writes(id BIGSERIAL PRIMARY KEY,attempted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());
 CREATE INDEX IF NOT EXISTS media_storage_writes_time ON media_storage_writes(attempted_at);`;
function ensure(){return ready??(ready=qSchema(schema).catch(error=>{ready=undefined;throw error}))}
type Client={query:(sql:string,args?:unknown[])=>Promise<{rows:Record<string,unknown>[]}>};
async function transaction<T>(work:(client:Client)=>Promise<T>){
 await ensure();const pool=db();if(!pool)throw Error('media_budget_unavailable');let client;
 try{client=await pool.connect();await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='10s'");await client.query('SELECT pg_advisory_xact_lock(74111620)');const value=await work(client);await client.query('COMMIT');return value}
 catch(error){await client?.query('ROLLBACK').catch(()=>{});throw error}finally{client?.release();await pool.end().catch(()=>{})}
}
async function initialize(client:Client,inventory:MediaInventory){
 await client.query('INSERT INTO media_storage_budget(id) VALUES(true) ON CONFLICT DO NOTHING');
 const row=(await client.query('SELECT initialized FROM media_storage_budget WHERE id=true')).rows[0];
 if(row?.initialized===true||row?.initialized==='t')return;
 const files=await inventory();if(files.length>10000)throw Error('media_inventory_unavailable');
 for(const file of files){
  if(!/^[a-f0-9]{64}$/.test(file.key)||!Number.isSafeInteger(file.bytes)||file.bytes<=0)throw Error('media_inventory_unavailable');
 }
 if(files.length)await client.query('INSERT INTO media_storage_objects(key_hash,bytes,stored) SELECT key_hash,bytes,true FROM unnest($1::text[],$2::bigint[]) AS files(key_hash,bytes) ON CONFLICT DO NOTHING',[files.map(file=>file.key),files.map(file=>file.bytes)]);
 await client.query('UPDATE media_storage_budget SET initialized=true WHERE id=true');
}
async function snapshot(client:Client){
 const row=(await client.query(`SELECT coalesce(sum(bytes),0) AS bytes,count(*) AS assets,
 (SELECT count(*) FROM media_storage_writes) AS writes,
 (SELECT coalesce(min(attempted_at),now())::text FROM media_storage_writes) AS window FROM media_storage_objects`)).rows[0];
 return {usedBytes:Number(row.bytes),assets:Number(row.assets),limitBytes:MEDIA_STORAGE_LIMIT,dailyWrites:Number(row.writes),dailyLimit:MEDIA_DAILY_WRITES,windowStartedAt:String(row.window)};
}
async function resetWindow(client:Client){await client.query("DELETE FROM media_storage_writes WHERE attempted_at<=clock_timestamp()-interval '1 day'")}
export function mediaBudgetStatus(inventory:MediaInventory){return transaction(async client=>{await initialize(client,inventory);await resetWindow(client);return snapshot(client)})}
/** Reserve before any KV write. Unknown outcomes stay reserved, conservatively. */
export function reserveMediaStorage(key:string,bytes:number,inventory:MediaInventory){
 if(!/^[a-f0-9]{64}$/.test(key)||!Number.isSafeInteger(bytes)||bytes<1)throw Error('invalid_size');
 return transaction(async client=>{
  await initialize(client,inventory);await resetWindow(client);
  const existing=(await client.query('SELECT bytes,stored FROM media_storage_objects WHERE key_hash=$1',[key])).rows[0];
  if(existing&&Number(existing.bytes)!==bytes)throw Error('media_storage_conflict');
  if(existing&&(existing.stored===true||existing.stored==='t'))return false;
  const state=await snapshot(client);
  if(state.usedBytes+(existing?0:bytes)>MEDIA_STORAGE_LIMIT)throw Error('media_storage_limit');
  if(state.dailyWrites>=MEDIA_DAILY_WRITES)throw Error('media_daily_limit');
  if(!existing)await client.query('INSERT INTO media_storage_objects(key_hash,bytes) VALUES($1,$2)',[key,bytes]);
  await client.query('INSERT INTO media_storage_writes DEFAULT VALUES');return true;
 });
}
export async function markMediaStored(key:string){await transaction(async client=>{await client.query('UPDATE media_storage_objects SET stored=true WHERE key_hash=$1',[key])})}
/** Call only after a confirmed KV deletion. Repeats cannot subtract twice. */
export async function releaseMediaStorage(key:string){await transaction(async client=>{await client.query('DELETE FROM media_storage_objects WHERE key_hash=$1',[key])})}
