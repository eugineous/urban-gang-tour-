import {expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({q:vi.fn(),qSchema:vi.fn()}));
import {paystackAttemptIdentity} from '@/lib/server/paystack-attempts';
import {mpesaAttemptIdentity} from '@/lib/server/mpesa-attempts';
const token='0123456789abcdef0123456789abcdef';
const purchase={items:[{id:'tee',qty:1}],contact:{name:'Fixture',email:'fixture@example.test'},fulfillment:{method:'pickup'}};
it('binds the normalized request and owner without retaining personal information or sharing provider scopes',()=>{
 const first=paystackAttemptIdentity('validated-account:1',token,purchase);
 expect(paystackAttemptIdentity('validated-account:1',token,{fulfillment:{method:'pickup'},contact:{email:'fixture@example.test',name:'Fixture'},items:[{qty:1,id:'tee'}]})).toEqual(first);
 for(const changed of [{...purchase,items:[{id:'tee',qty:2}]},{...purchase,contact:{...purchase.contact,name:'Changed'}},{...purchase,fulfillment:{method:'delivery'}}])expect(paystackAttemptIdentity('validated-account:1',token,changed).requestHash).not.toBe(first.requestHash);
 expect(paystackAttemptIdentity('validated-account:2',token,purchase).scopeHash).not.toBe(first.scopeHash);
 const mpesa=mpesaAttemptIdentity('validated-account:1',token,purchase);
 expect(first.scopeHash).not.toBe(mpesa.scopeHash);expect(first.tokenHash).not.toBe(mpesa.tokenHash);expect(first.requestHash).not.toBe(mpesa.requestHash);
 expect(JSON.stringify(first)).not.toContain('fixture@example.test');
});
it('rejects invalid owners, retry keys and unhashable normalized request values',()=>{
 for(const owner of ['', ' ', 'a'.repeat(257)])expect(()=>paystackAttemptIdentity(owner,token,purchase)).toThrow('invalid_attempt_owner');
 for(const key of ['short','a'.repeat(129),'a'.repeat(31)+'!'])expect(()=>paystackAttemptIdentity('validated-account:1',key,purchase)).toThrow('invalid_attempt_token');
 for(const request of [undefined,NaN,{items:undefined},new Date()])expect(()=>paystackAttemptIdentity('validated-account:1',token,request)).toThrow('invalid_attempt_request');
});
