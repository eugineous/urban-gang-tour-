import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ q: vi.fn(), verified: vi.fn(async () => true) }));
vi.mock('@/lib/server/db', () => ({ hasDb: () => true, q: state.q }));
vi.mock('@/lib/server/session', () => ({ verifyAdminSession: state.verified, hasPerm: () => true, adminActor: () => 'fixture' }));
vi.mock('@/lib/server/affiliate-program', () => ({ ensureAffiliateLedger: vi.fn(), affiliateEarnings: vi.fn(), validateAffiliateProgram: vi.fn(), saveAffiliateProgram: vi.fn(), recordAffiliatePayout: vi.fn() }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'fixture' }));
import { PATCH as reviewAffiliate } from '@/app/api/admin/affiliates/route';
import { PUT as configureProgram } from '@/app/api/admin/affiliates/program/route';
import { POST as recordPayout } from '@/app/api/admin/affiliates/payouts/route';
import { POST as importCaption } from '@/app/api/captions/route';
beforeEach(() => vi.clearAllMocks());
describe('privileged mutation origin wiring with real origin policy', () => {
  for (const [name, handler] of [['affiliate review', reviewAffiliate], ['programme configuration', configureProgram], ['payout recording', recordPayout], ['caption import', importCaption]] as const) {
    it.each([undefined, 'https://evil.example.test'])(`rejects ${name} without a trusted Origin before checking identity or querying`, async origin => {
      const response = await handler(new Request('https://urbangangtour.co.ke/api/fixture', { method: 'POST', headers: origin ? { origin } : {}, body: '{}' }));
      expect(response.status).toBe(403);
      expect(state.verified).not.toHaveBeenCalled();
      expect(state.q).not.toHaveBeenCalled();
    });
  }
});
