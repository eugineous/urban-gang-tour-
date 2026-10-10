import {q,hasDb,db} from './db';
import {randomBytes} from 'node:crypto';
import {ensureEngagementSchema} from './engagement';
export type AffiliateProgram={enabled:boolean;rateBps:number|null;termsVersion:string;terms:string;eligibleEventIds:string[]};
export const INACTIVE_PROGRAM:AffiliateProgram={enabled:false,rateBps:null,termsVersion:'',terms:'',eligibleEventIds:[]};
export function validateAffiliateProgram(b:unknown):b is AffiliateProgram{if(!b||typeof b!=='object'||Array.isArray(b))return false;const p=b as AffiliateProgram;return Object.keys(p).every(k=>['enabled','rateBps','termsVersion','terms','eligibleEventIds'].includes(k))&&typeof p.enabled==='boolean'&&(p.rateBps===null||Number.isInteger(p.rateBps)&&p.rateBps>0&&p.rateBps<=10000)&&typeof p.termsVersion==='string'&&p.termsVersion.length<=80&&typeof p.terms==='string'&&p.terms.length<=15000&&Array.isArray(p.eligibleEventIds)&&p.eligibleEventIds.length<=200&&p.eligibleEventIds.every(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x))&&(!p.enabled||p.rateBps!==null&&p.termsVersion.trim().length>0&&p.terms.trim().length>=20&&p.eligibleEventIds.length>0)}
export async function affiliateProgram():Promise<AffiliateProgram>{const rows=await q('SELECT value FROM settings WHERE key=$1',['affiliate_program']);const p=rows[0]?.value;return validateAffiliateProgram(p)?p:INACTIVE_PROGRAM}
export async function ensureAffiliateLedger(){await ensureEngagementSchema();await q('ALTER TABLE affiliate_codes ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT');await q('ALTER TABLE affiliate_codes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ');await q(`CREATE TABLE IF NOT EXISTS affiliate_order_referrals(order_id TEXT PRIMARY KEY REFERENCES orders(id),affiliate_id TEXT NOT NULL REFERENCES affiliate_codes(id),rate_bps INTEGER NOT NULL CHECK(rate_bps BETWEEN 1 AND 10000),terms_version TEXT NOT NULL,event_id TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);await q(`CREATE TABLE IF NOT EXISTS affiliate_payout_records(id TEXT PRIMARY KEY,affiliate_id TEXT NOT NULL REFERENCES affiliate_codes(id),amount INTEGER NOT NULL CHECK(amount>0),reference TEXT UNIQUE NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);await q(`CREATE TABLE IF NOT EXISTS refunds(id SERIAL PRIMARY KEY,order_id TEXT NOT NULL,amount INT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT now())`)}
// Attribution never changes prices. Only approved affiliates with current accepted terms
// and explicitly configured owned ticket events can receive an order attribution.
export async function recordOrderReferral(orderId:string,code:string,buyerId?:number):Promise<boolean>{if(!hasDb()||!/^[a-f0-9]{24}$/.test(code))return false;await ensureAffiliateLedger();const program=await affiliateProgram();if(!program.enabled||!program.rateBps)return false;const rows=await q(`SELECT a.id,a.user_id,a.accepted_terms_version,u.email AS affiliate_email,o.email AS buyer_email,o.items FROM affiliate_codes a JOIN users u ON u.id=a.user_id JOIN orders o ON o.id=$2 WHERE a.id=$1 AND a.status='approved'`,[code,orderId]);const row=rows[0];if(!row||row.user_id===buyerId||Number(row.user_id)===buyerId||row.affiliate_email&&row.buyer_email&&row.affiliate_email.toLowerCase()===row.buyer_email.toLowerCase()||row.accepted_terms_version!==program.termsVersion)return false;const items=typeof row.items==='string'?JSON.parse(row.items):row.items;if(!Array.isArray(items)||items.length!==1||typeof items[0]?.id!=='string'||!items[0].id.startsWith('ticket:'))return false;const eventId=items[0].id.split(':')[1];if(!program.eligibleEventIds.includes(eventId))return false;const inserted=await q(`INSERT INTO affiliate_order_referrals(order_id,affiliate_id,rate_bps,terms_version,event_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id) DO NOTHING RETURNING order_id`,[orderId,code,program.rateBps,program.termsVersion,eventId]);return inserted.length>0}
export const EARNINGS_SQL=`SELECT r.order_id,r.event_id,r.rate_bps,r.terms_version,o.status,o.created_at,GREATEST(0,o.total-COALESCE(f.amount,0))::int AS net_sale,CASE WHEN o.status IN ('paid','fulfilled','partially_refunded') THEN floor(GREATEST(0,o.total-COALESCE(f.amount,0))*r.rate_bps::numeric/10000)::int ELSE 0 END AS commission_kes FROM affiliate_order_referrals r JOIN orders o ON o.id=r.order_id LEFT JOIN (SELECT order_id,SUM(amount)::int AS amount FROM refunds GROUP BY order_id) f ON f.order_id=o.id WHERE r.affiliate_id=$1 ORDER BY o.created_at DESC`;
export async function affiliateEarnings(affiliateId:string){await ensureAffiliateLedger();const sales=await q(EARNINGS_SQL,[affiliateId]);const payouts=await q('SELECT id,amount,reference,created_at FROM affiliate_payout_records WHERE affiliate_id=$1 ORDER BY created_at DESC',[affiliateId]);const earned=sales.reduce((sum,r)=>sum+Number(r.commission_kes),0),paid=payouts.reduce((sum,r)=>sum+Number(r.amount),0);return{sales,payouts,earned_kes:earned,recorded_payout_kes:paid,balance_kes:earned-paid}}

export async function validReferral(code:string){
 if(!/^[a-f0-9]{24}$/.test(code))return null;
 await ensureAffiliateLedger();const program=await affiliateProgram();if(!program.enabled)return null;
 const rows=await q("SELECT id FROM affiliate_codes WHERE id=$1 AND status='approved' AND accepted_terms_version=$2",[code,program.termsVersion]);
 return rows[0]?{code,termsVersion:program.termsVersion}:null;
}
export async function saveAffiliateProgram(program:AffiliateProgram,actor:string){
 if(!validateAffiliateProgram(program))throw Error('invalid_program');
 await ensureAffiliateLedger();
 if(program.enabled){const eligible=await q("SELECT id FROM tour_events WHERE id=ANY($1::text[]) AND kind='ticketed' AND status='published'",[program.eligibleEventIds]);if(eligible.length!==new Set(program.eligibleEventIds).size)throw Error('invalid_eligible_events');}
 const previous=await affiliateProgram();
 if(previous.termsVersion && program.termsVersion===previous.termsVersion && (program.rateBps!==previous.rateBps||program.terms!==previous.terms||JSON.stringify([...program.eligibleEventIds].sort())!==JSON.stringify([...previous.eligibleEventIds].sort())))throw Error('new_terms_version_required');
 await q("INSERT INTO settings(key,value) VALUES('affiliate_program',$1::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[JSON.stringify(program)]);
 await q('INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3::jsonb)',[actor,'affiliate.program',JSON.stringify({enabled:program.enabled,termsVersion:program.termsVersion,rateBps:program.rateBps,eligibleEventIds:program.eligibleEventIds})]);
 return program;
}
// Records an already-completed external payout. This never transfers money.
// Locking the affiliate row serializes simultaneous payout recording; a unique
// reference rejects accidental retries. Refunds always reduce earned commission.
export async function recordAffiliatePayout(affiliateId:string,amount:number,reference:string,actor:string){
 await ensureAffiliateLedger();const pool=db();if(!pool)throw Error('unavailable');const client=await pool.connect();
 try{await client.query('BEGIN');const affiliate=await client.query('SELECT id FROM affiliate_codes WHERE id=$1 FOR UPDATE',[affiliateId]);if(!affiliate.rows.length)throw Error('affiliate_not_found');
 const earned=await client.query(EARNINGS_SQL,[affiliateId]);const paid=await client.query('SELECT COALESCE(SUM(amount),0)::int AS amount FROM affiliate_payout_records WHERE affiliate_id=$1',[affiliateId]);
 const balance=earned.rows.reduce((sum,r)=>sum+Number(r.commission_kes),0)-Number(paid.rows[0].amount);
 if(amount>balance)throw Error('payout_exceeds_balance');
 const record=await client.query('INSERT INTO affiliate_payout_records(id,affiliate_id,amount,reference,actor) VALUES($1,$2,$3,$4,$5) RETURNING id,amount,reference,created_at',[randomBytes(12).toString('hex'),affiliateId,amount,reference,actor]);
 await client.query('INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3::jsonb)',[actor,'affiliate.payout_recorded',JSON.stringify({affiliateId,amount,reference})]);await client.query('COMMIT');return record.rows[0];
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release();await pool.end()}
}
