import {expect,it} from 'vitest';
import {mpesaAttemptIdentity} from '@/lib/server/mpesa-attempts';
const token='0123456789abcdef0123456789abcdef';
const purchase={items:[{id:'tee',qty:1,variant:'L'}],contact:{name:'Fixture',phone:'254700000000'},fulfillment:{method:'pickup'}};
it('canonicalizes object key order without discarding purchase or contact changes',()=>{
 const first=mpesaAttemptIdentity('validated-account:1',token,purchase);
 expect(mpesaAttemptIdentity('validated-account:1',token,{fulfillment:{method:'pickup'},contact:{phone:'254700000000',name:'Fixture'},items:[{qty:1,variant:'L',id:'tee'}]})).toEqual(first);
 for(const changed of [{...purchase,items:[{id:'tee',qty:2,variant:'L'}]},{...purchase,contact:{...purchase.contact,name:'Different'}},{...purchase,fulfillment:{method:'delivery'}}]){
  const next=mpesaAttemptIdentity('validated-account:1',token,changed);expect(next.tokenHash).toBe(first.tokenHash);expect(next.requestHash).not.toBe(first.requestHash);
 }
 expect(mpesaAttemptIdentity('validated-account:2',token,purchase).scopeHash).not.toBe(first.scopeHash);
 expect(JSON.stringify(first)).not.toContain('254700000000');
});
it('does not pretend a hash is authentication and rejects malformed identity input',()=>{
 expect(()=>mpesaAttemptIdentity('',token,purchase)).toThrow('invalid_attempt_owner');
 expect(()=>mpesaAttemptIdentity('owner','short',purchase)).toThrow('invalid_attempt_token');
 for(const invalid of [undefined,NaN,{items:undefined},new Date()])expect(()=>mpesaAttemptIdentity('owner',token,invalid)).toThrow('invalid_attempt_request');
});
