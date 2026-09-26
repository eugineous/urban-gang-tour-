import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const stored: any[] = [];
const client = {
  query: vi.fn(async (sql: string, params: any[] = []) => {
    if (sql.startsWith('SELECT * FROM tickets WHERE order_id=')) {
      return { rows: stored.filter((ticket) => ticket.order_id === params[0]) };
    }
    if (sql.includes('INSERT INTO tickets')) {
      const [code, order_id, event_id, tier_name, holder, position, of_count, marketplace_event_id] = params;
      const ticket = { code, order_id, event_id, tier_name, holder, position, of_count, marketplace_event_id, created_at: new Date().toISOString() };
      stored.push(ticket);
      return { rows: [ticket] };
    }
    return { rows: [] };
  }),
  release: vi.fn(),
};
const pool = {
  query: vi.fn(async () => ({ rows: [] })),
  connect: vi.fn(async () => client),
  end: vi.fn(async () => {}),
};

vi.mock('@/lib/server/db', () => ({ db: () => pool }));
vi.mock('@/lib/server/catalog', () => ({
  getTicketedEvents: vi.fn(async () => []),
  getTicketTiers: vi.fn(async () => ({ event_1: { tiers: [{ name: 'Regular', price: 500 }] } })),
}));
vi.mock('@/lib/server/marketplace', () => ({ getMarketplaceEventById: vi.fn(async () => null) }));

import { codeAuthentic, ensureTickets, mintCode, signedTicketBlob, verifyTicketBlob } from '@/lib/server/tickets';

const paidOrder = {
  id: 'ORD-QR-100',
  status: 'paid',
  name: 'Test Holder',
  items: [{ id: 'ticket:event_1:0', qty: 2, name: 'Event - Regular' }],
};

describe('ticket issuance and authenticity', () => {
  it('mints one stable ticket set when the same paid order is replayed', async () => {
    stored.length = 0;
    client.query.mockClear();

    const first = await ensureTickets(paidOrder);
    const replay = await ensureTickets(paidOrder);

    expect(first).toHaveLength(2);
    expect(replay).toEqual(first);
    expect(stored).toHaveLength(2);
    expect(new Set(first.map((ticket) => ticket.code)).size).toBe(2);
    expect(first.every((ticket) => codeAuthentic(ticket.code))).toBe(true);
  });

  it('does not mint a partial or rounded entitlement from malformed ticket lines', async () => {
    stored.length = 0;

    const tickets = await ensureTickets({
      ...paidOrder,
      id: 'ORD-QR-BAD',
      items: [
        { id: 'ticket:event_1:0', qty: 1, name: 'Event - Regular' },
        { id: 'ticket:event_1:0', qty: 1.5, name: 'Event - Regular' },
      ],
    });

    expect(tickets).toEqual([]);
    expect(stored).toEqual([]);
  });

  it('rejects non-paid orders before touching ticket storage', async () => {
    stored.length = 0;
    const tickets = await ensureTickets({ ...paidOrder, id: 'ORD-QR-PENDING', status: 'pending' });
    expect(tickets).toEqual([]);
    expect(stored).toEqual([]);
  });

  it('accepts a valid signed blob and rejects tampered or structurally invalid blobs', () => {
    const ticket = { code: mintCode(), order_id: 'ORD-QR-100', event_id: 'event_1', tier_name: 'Regular', created_at: '2026-09-26T00:00:00.000Z' };
    const blob = signedTicketBlob(ticket);

    expect(verifyTicketBlob(blob)).toEqual({ c: ticket.code, o: 'ORD-QR-100', e: 'event_1', t: 'Regular', i: '2026-09-26T00:00:00.000Z' });
    expect(verifyTicketBlob(blob.slice(0, -1) + (blob.endsWith('A') ? 'B' : 'A'))).toBeNull();

    const body = Buffer.from(JSON.stringify({ c: ticket.code })).toString('base64url');
    const signature = createHmac('sha256', 'dev-secret-change-me').update('tktsig:' + body).digest('base64url');
    expect(verifyTicketBlob(`${body}.${signature}`)).toBeNull();
  });
});
