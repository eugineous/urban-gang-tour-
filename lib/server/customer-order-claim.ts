import {q} from './db';
import {ensureCustomerIdentitySchema} from './customer-identity';
/** Authenticated caller AND private reference AND verified matching contact.
 * Matching a claimed email alone is never authority. No financial state changes. */
export async function claimGuestOrder(userId:number,orderId:string):Promise<boolean>{
 if(!Number.isSafeInteger(userId)||userId<1||orderId.length>44||!/^ORD-[A-Z0-9]+[A-F0-9]{24}$/.test(orderId))return false;
 await ensureCustomerIdentitySchema();
 const rows=await q(`UPDATE orders o SET user_id=u.id FROM users u
 WHERE o.id=$1 AND u.id=$2 AND u.email_verified_at IS NOT NULL
 AND NULLIF(btrim(u.email),'') IS NOT NULL AND lower(btrim(o.email))=lower(btrim(u.email))
 AND (o.user_id IS NULL OR o.user_id=u.id) RETURNING o.id`,[orderId,userId]);
 return rows.length===1;
}
