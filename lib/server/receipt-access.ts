import {q,hasDb} from './db';
import {validatedCurrentBuyer,ensureCustomerAccountSchema} from './customer-account';
import {verifyAdminSession,hasPerm} from './session';

const ID_RE=/^ORD-[A-Z0-9-]{4,40}$/;
// Matches newly issued references: timestamp prefix followed by 12 random bytes.
const STRONG_ID_RE=/^ORD-[A-Z0-9]+[A-F0-9]{24}$/;

/** Legacy references are identifiers, not public capabilities. Never look them up before authorization. */
export async function accessibleReceiptOrder(req:Request,id:string):Promise<any|null>{
 if(!ID_RE.test(id)||!hasDb())return null;
 if(STRONG_ID_RE.test(id)||(await verifyAdminSession(req))&&hasPerm(req,'orders')){
  return (await q('SELECT * FROM orders WHERE id=$1',[id]))[0]||null;
 }
 const buyer=await validatedCurrentBuyer(req);
 if(!buyer)return null;
 await ensureCustomerAccountSchema();
 return (await q('SELECT * FROM orders WHERE id=$1 AND user_id=$2',[id,buyer.id]))[0]||null;
}
