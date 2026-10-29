/**
 * Inventory transaction tests: the interrupted merch-inventory consequence
 * boundary. recordPaidMerchOrder must be idempotent per order, fail closed on
 * invalid lines, and only act on confirmed payments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type QueryCall = { sql: string; params: any[] };

function makeFakePool(calls: QueryCall[]) {
  const client = {
    query: vi.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)') && sql.includes('online_sale')) {
        return { rows: [{ n: '0' }] };
      }
      if (sql.includes('FROM products WHERE id=$1 FOR UPDATE')) {
        return { rows: [{ inventory_tracked: true }] };
      }
      if (sql.includes('SELECT id FROM merch_variants')) {
        return { rows: [{ id: 42 }] };
      }
      if (sql.includes('SUM(quantity)')) {
        return { rows: [{ on_hand: '100' }] };
      }
      if (sql.includes('COUNT(*)::int AS movement_count')) {
        return { rows: [{ movement_count: 0, on_hand: '100' }] };
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };
  return { connect: vi.fn(async () => client), end: vi.fn(async () => {}) };
}

const calls: QueryCall[] = [];
let fakePool: ReturnType<typeof makeFakePool>;

vi.mock('../lib/server/db', () => ({
  db: () => fakePool,
  hasDb: () => true,
  q: vi.fn(async () => []),
}));

vi.mock('../lib/server/ops', () => ({
  ensureOpsSchema: vi.fn(async () => {}),
}));

import { recordPaidMerchOrder } from '../lib/server/inventory';

beforeEach(() => {
  calls.length = 0;
  fakePool = makeFakePool(calls);
});

describe('recordPaidMerchOrder', () => {
  it('keeps repeated made-to-order variant purchases available without creating stock movements', async () => {
    const pool=makeFakePool(calls),client=await pool.connect();
    const original=client.query.getMockImplementation()!;
    client.query.mockImplementation(async(sql:string,params:any[]=[])=>{
      if(sql.includes('FROM products WHERE id=$1 FOR UPDATE')) {
        calls.push({sql,params});return {rows:[{inventory_tracked:false,made_to_order:true}]};
      }
      return original(sql,params);
    });
    fakePool=pool;
    for(const id of ['ORD-MADE-FIRST','ORD-MADE-SECOND'])await recordPaidMerchOrder({id,status:'paid',items:[{id:'cb-hoodie',qty:2,variant:'Black / M'}]});
    expect(calls.filter(call=>call.sql.includes('INSERT INTO merch_inventory_moves'))).toEqual([]);
    expect(calls.filter(call=>call.sql.includes('INSERT INTO merch_fulfillments'))).toHaveLength(2);
    expect(calls.filter(call=>call.sql.includes('INSERT INTO merch_order_settlements'))).toHaveLength(2);
  });

  it('does not reset fulfillment or repeat a settled made-to-order consequence',async()=>{
    const pool=makeFakePool(calls),client=await pool.connect();
    const original=client.query.getMockImplementation()!;
    client.query.mockImplementation(async(sql:string,params:any[]=[])=>{
      if(sql.includes('SELECT order_id FROM merch_order_settlements')){calls.push({sql,params});return {rows:[{order_id:'ORD-MADE-REPLAY'}]};}
      return original(sql,params);
    });fakePool=pool;
    await recordPaidMerchOrder({id:'ORD-MADE-REPLAY',status:'paid',items:[{id:'cb-hoodie',qty:2,variant:'Black / M'}]});
    expect(calls.some(call=>/INSERT INTO merch_(inventory_moves|fulfillments|order_settlements)/.test(call.sql))).toBe(false);
  });
  it('does nothing for non-confirmed payment status', async () => {
    await recordPaidMerchOrder({ id: 'ORD-1', items: [{ id: 'p1', qty: 1 }], status: 'pending' });
    expect(calls).toHaveLength(0);
  });

  it('throws on invalid line items', async () => {
    await expect(
      recordPaidMerchOrder({ id: 'ORD-1', items: [{ id: '', qty: 1 }], status: 'paid' })
    ).rejects.toThrow('invalid_inventory_line');
  });

  it('writes movements for a confirmed payment', async () => {
    await recordPaidMerchOrder({
      id: 'ORD-1',
      items: [
        { id: 'p1', qty: 2 },
        { id: 'p2', qty: 1, variant: 'Red' },
      ],
      status: 'paid',
    });
    const inserts = calls.filter((c) => c.sql.includes('INSERT INTO merch_inventory_moves'));
    expect(inserts).toHaveLength(2);
    // advisory lock acquired
    expect(calls.some((c) => c.sql.includes('pg_advisory_xact_lock'))).toBe(true);
  });

  it('is idempotent on replay (same order, same lines)', async () => {
    const items = [
      { id: 'p1', qty: 2 },
      { id: 'p2', qty: 1, variant: 'Red' },
    ];
    await recordPaidMerchOrder({ id: 'ORD-1', items, status: 'paid' });
    const firstCount = calls.filter((c) => c.sql.includes('INSERT INTO merch_inventory_moves')).length;
    calls.length = 0; // reset before replay
    // simulate replay: existing count now equals lines.length
    fakePool = {
      connect: vi.fn(async () => ({
        query: vi.fn(async (sql: string) => {
          calls.push({ sql, params: [] });
          if (sql.includes('online_sale')) return { rows: [{ n: String(firstCount) }] };
          return { rows: [] };
        }),
        release: vi.fn(),
      })),
      end: vi.fn(async () => {}),
    };
    await recordPaidMerchOrder({ id: 'ORD-1', items, status: 'paid' });
    const inserts = calls.filter((c) => c.sql.includes('INSERT INTO merch_inventory_moves'));
    expect(inserts).toHaveLength(0); // no new writes on replay
  });

  it('skips ticket: prefixed lines', async () => {
    await recordPaidMerchOrder({
      id: 'ORD-1',
      items: [
        { id: 'ticket:abc', qty: 1 },
        { id: 'p1', qty: 1 },
      ],
      status: 'paid',
    });
    const inserts = calls.filter((c) => c.sql.includes('INSERT INTO merch_inventory_moves'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params[0]).toBe('p1');
  });

  it('rejects combined variants that exceed the same product stock', async () => {
    await expect(recordPaidMerchOrder({
      id: 'ORD-TWO-SIZES', status: 'paid',
      items: [{ id: 'p1', variant: 'M', qty: 60 }, { id: 'p1', variant: 'L', qty: 60 }],
    })).rejects.toThrow('insufficient_inventory');
    expect(calls.some(call => call.sql.includes('INSERT INTO merch_inventory_moves'))).toBe(false);
    expect(calls.some(call => call.sql === 'ROLLBACK')).toBe(true);
  });
  it('counts separately personalized names against the same physical size inventory', async () => {
    await recordPaidMerchOrder({ id:'ORD-NAMES',status:'paid',items:[
      {id:'p1',qty:2,variant:'L',printableName:'Amina'},
      {id:'p1',qty:3,variant:'L',printableName:'Brian'},
    ]});
    const inserts=calls.filter(call=>call.sql.includes('INSERT INTO merch_inventory_moves'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params.slice(0,3)).toEqual(['p1',42,-5]);
  });
});
