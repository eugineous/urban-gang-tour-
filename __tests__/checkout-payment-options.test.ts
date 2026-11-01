import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {GET} from '@/app/api/checkout/fulfillment/route';

const keys=['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY','PAYSTACK_SECRET_KEY','PAYSTACK_ENABLED','STRIPE_SECRET_KEY','MERCH_DELIVERY_FEE_KES'] as const;
const fetch=vi.fn(()=>{throw Error('Options must not contact a provider')});
beforeEach(()=>{for(const key of keys)vi.stubEnv(key,'');vi.stubGlobal('fetch',fetch);fetch.mockClear()});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
async function options(){const response=await GET(new Request('https://urbangangtour.co.ke/api/checkout/fulfillment'));expect(response.headers.get('cache-control')).toBe('no-store');return response.json()}
it('keeps all payments unavailable when unconfigured and preserves pickup',async()=>{
 const data=await options();expect(data.payments).toEqual({mpesa:false,card:false});expect(data.pickup).toMatchObject({enabled:true,fee:0});expect(data.delivery).toEqual({enabled:false,fee:null});expect(fetch).not.toHaveBeenCalled();
});
it('requires the complete existing M-Pesa configuration',async()=>{
 for(const key of keys.slice(0,3))vi.stubEnv(key,'fixture');expect((await options()).payments?.mpesa).toBe(false);
 vi.stubEnv('MPESA_PASSKEY','fixture');expect((await options()).payments).toEqual({mpesa:true,card:false});expect(fetch).not.toHaveBeenCalled();
});
it('never exposes disabled Paystack as a card option despite a stored key',async()=>{
 vi.stubEnv('PAYSTACK_SECRET_KEY','fixture-private-value');vi.stubEnv('PAYSTACK_ENABLED','false');
 const data=await options();expect(data.payments).toEqual({mpesa:false,card:false});expect(JSON.stringify(data)).not.toContain('fixture-private-value');expect(fetch).not.toHaveBeenCalled();
});
it.each(['stripe','paystack'])('exposes configured %s cards without initializing a payment',async provider=>{
 if(provider==='stripe')vi.stubEnv('STRIPE_SECRET_KEY','fixture-private-value');else{vi.stubEnv('PAYSTACK_SECRET_KEY','fixture-private-value');vi.stubEnv('PAYSTACK_ENABLED','true')}
 const data=await options();expect(data.payments).toEqual({mpesa:false,card:true});expect(JSON.stringify(data)).not.toContain('fixture-private-value');expect(fetch).not.toHaveBeenCalled();
});
