/**
 * Route-level authority regression coverage for Control Room actions that
 * cannot be delegated to a crew permission.  The database and side-effect
 * dependencies are mocked so these assertions exercise the route guards,
 * not provider configuration.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authority = vi.hoisted(() => ({ superAdmin: false }));
const database = vi.hoisted(() => ({ available: true }));

vi.mock('@/lib/server/session', () => ({
  verifyAdminSession: vi.fn(async () => true),
  isSuperAdmin: vi.fn(() => authority.superAdmin),
  isAdmin: vi.fn(() => true),
  hasPerm: vi.fn(() => false),
  adminActor: vi.fn(() => 'admin@example.test'),
}));

vi.mock('@/lib/server/db', () => ({
  db: vi.fn(() => database.available ? {} : null),
  q: vi.fn(async () => []),
}));

vi.mock('@/lib/server/origin', () => ({ requireOrigin: vi.fn(() => true) }));
vi.mock('@/lib/server/ops', () => ({
  ensureOpsSchema: vi.fn(async () => {}),
  opsAudit: vi.fn(async () => {}),
  createNumberedDocument: vi.fn(async () => ({})),
  LEAD_STAGES: [],
  DEFAULT_CHECKLIST_TEMPLATE: [],
}));
vi.mock('@/lib/server/marketplace', () => ({
  getCommissionPercent: vi.fn(async () => 0),
  setCommissionPercent: vi.fn(async () => {}),
  sendOrganizerNotification: vi.fn(async () => {}),
  ensureMarketplaceColumns: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/paystack', () => ({ paystackCreateSubaccount: vi.fn() }));
vi.mock('@/lib/server/alert', () => ({ alertCritical: vi.fn() }));
vi.mock('@/lib/server/client-errors', () => ({ listClientErrors: vi.fn(async () => []) }));
vi.mock('@/lib/server/indexnow', () => ({ pingIndexNow: vi.fn() }));
vi.mock('@/lib/server/public-cache', () => ({ bumpEventPublicTruth: vi.fn() }));
vi.mock('@/lib/server/ratelimit', () => ({
  rateLimit: vi.fn(() => true),
  clientIp: vi.fn(() => '127.0.0.1'),
}));
vi.mock('@/lib/server/catalog', () => ({ getTicketTiers: vi.fn(async () => ({})) }));
vi.mock('@/lib/server/tickets', () => ({ ensureTickets: vi.fn(async () => []) }));
vi.mock('@/lib/server/receipt-email', () => ({ sendReceiptEmail: vi.fn(async () => {}) }));

import { GET, POST as postOps } from '@/app/api/admin/ops/route';
import { POST as postCompTicket } from '@/app/api/admin/tickets/comp/route';

function request(url: string, body?: unknown): Request {
  return new Request(url, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify(body),
  });
}

describe('Control Room super-admin authority boundaries', () => {
  beforeEach(() => {
    authority.superAdmin = false;
    database.available = true;
  });

  it('denies a crew session cross-module quick statistics even if it has a module permission', async () => {
    authority.superAdmin = false;

    const response = await GET(request('http://localhost/api/admin/ops?view=quickStats'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it.each([
    'marketplaceOrganizer.approve',
    'marketplaceOrganizer.reject',
    'marketplaceOrganizer.suspend',
    'marketplaceOrganizer.reinstate',
    'marketplaceCommission.save',
    'marketplaceEvent.approve',
    'marketplaceEvent.reject',
    'marketplaceEvent.cancel',
  ])('denies crew marketplace trust action %s', async (kind) => {
    authority.superAdmin = false;

    const response = await postOps(request('http://localhost/api/admin/ops', { kind, data: {} }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it('denies a crew session complimentary ticket issuance', async () => {
    authority.superAdmin = false;

    const response = await postCompTicket(request('http://localhost/api/admin/tickets/comp', {}));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it('rejects protected ops actions before exposing database outage state to crew', async () => {
    database.available = false;

    const quickStats = await GET(request('http://localhost/api/admin/ops?view=quickStats'));
    const marketplaceAction = await postOps(
      request('http://localhost/api/admin/ops', { kind: 'marketplaceOrganizer.approve', data: {} }),
    );

    expect(quickStats.status).toBe(403);
    expect(marketplaceAction.status).toBe(403);
  });

  it('allows the super-admin path through each protected boundary', async () => {
    authority.superAdmin = true;

    const quickStats = await GET(request('http://localhost/api/admin/ops?view=quickStats'));
    expect(quickStats.status).toBe(200);

    const marketplaceAction = await postOps(
      request('http://localhost/api/admin/ops', { kind: 'marketplaceOrganizer.approve', data: {} }),
    );
    expect(marketplaceAction.status).not.toBe(403);

    const compTicket = await postCompTicket(request('http://localhost/api/admin/tickets/comp', {}));
    expect(compTicket.status).toBe(400);
    await expect(compTicket.json()).resolves.toEqual({ error: 'unknown_event' });
  });
});
