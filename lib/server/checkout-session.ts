import {signToken,verifyToken,sessionSecretConfigured} from './session';
import {randomBytes} from 'node:crypto';
export const CHECKOUT_COOKIE='ugt_checkout';
export function checkoutPrincipal(req:Request):string|null{
 const cookie=(req.headers.get('cookie')||'').match(/(?:^|;\s*)ugt_checkout=([^;]+)/)?.[1];
 const value=verifyToken<{role?:string;id?:string}>(cookie);
 return value?.role==='checkout_guest'&&typeof value.id==='string'&&/^[a-f0-9]{64}$/.test(value.id)?'checkout:'+value.id:null;
}
export function createCheckoutSession(){
 if(!sessionSecretConfigured())throw Error('checkout_session_unavailable');
 return signToken({role:'checkout_guest',id:randomBytes(32).toString('hex')},30);
}
