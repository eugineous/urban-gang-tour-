import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const query=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/db',()=>({q:query}));
vi.mock('@/lib/server/customer-identity',()=>({ensureCustomerIdentitySchema:async()=>{}}));
import {queueCustomerPasswordReset} from '@/lib/server/customer-email-verification';
beforeEach(()=>{query.mockReset();vi.stubEnv('SESSION_SECRET','fixture-secret');vi.stubEnv('RESEND_API_KEY','fixture-key')});afterEach(()=>vi.unstubAllEnvs());
it('fails before account lookup when reset delivery is not configured',async()=>{
 vi.stubEnv('RESEND_API_KEY','');await expect(queueCustomerPasswordReset('buyer@example.test')).rejects.toThrow('email_delivery_unavailable');expect(query).not.toHaveBeenCalled();
});
it('returns an opaque durable job ID without returning a reset credential',async()=>{
 query.mockResolvedValue([{id:'account-reset-fixture'}]);const id=await queueCustomerPasswordReset('buyer@example.test');expect(id).toBe('account-reset-fixture');
 const args=query.mock.calls[0][1];expect(args.some((value:unknown)=>typeof value==='string'&&value.includes('/account?reset='))).toBe(false);
});
