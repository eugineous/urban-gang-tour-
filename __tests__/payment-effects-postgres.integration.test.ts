// Executes the production SQL only against a disposable PostgreSQL container
// with --network none. Never reads or uses production DATABASE_URL.
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { DisposablePostgres } from './helpers/disposable-postgres';

const adapter = vi.hoisted(() => ({ q: vi.fn(), qSchema: vi.fn(), db: vi.fn(), hasDb: () => true }));
vi.mock('@/lib/server/db', () => adapter);
vi.mock('@/lib/server/ops', () => ({ ensureOpsSchema: async () => {} }));
vi.mock('@/lib/server/catalog', () => ({ getTicketTiers: async () => ({ event: { tiers: [{ name: 'Fixture admission' }] } }) }));
vi.mock('@/lib/server/marketplace', () => ({ getMarketplaceEventById: async () => null }));
import { ensurePaymentEffectsSchema, processPaymentEffects, settlePaystackOrder, settleMpesaOrder, settleStripeOrder } from '@/lib/server/payment-effects';
vi.mock('@/lib/server/receipt-email', () => ({ renderReceiptEmailPayload: async () => JSON.stringify({ to: 'fixture@example.invalid', subject: 'Fixture receipt', html: 'Fixture receipt' }) }));
import { ensureEmailOutbox } from '@/lib/server/email-outbox';
import { ensureTicketSchema } from '@/lib/server/tickets';
import { recordPaidMerchOrder } from '@/lib/server/inventory';

const enabled = process.env.UGT_PAYMENT_EFFECT_PG_FIXTURE === '1';
// Each fixture query spawns an isolated Docker/psql session. Leave bounded
// headroom for the transport under concurrent CI without changing assertions.
const fixtureTimeout = 30000;
const fixture = new DisposablePostgres();
const test = it.skipIf(!enabled);
const id = 'ORD-EFFECT123';
const input = { orderId: id, reference: id, amountKes: 1000 };
const lines = [{ id: 'tee', qty: 2, unit: 500 }];
const normalize = (rows: Record<string, unknown>[]) => rows.map(row => ({ ...row,
  ...('items' in row && typeof row.items === 'string' ? { items: JSON.parse(row.items) } : {}),
  ...('total' in row ? { total: Number(row.total) } : {}),
  ...('attempts' in row ? { attempts: Number(row.attempts) } : {}),
  ...('inventory_tracked' in row ? { inventory_tracked: row.inventory_tracked === 't' || row.inventory_tracked === true } : {}),
  ...('made_to_order' in row ? { made_to_order: row.made_to_order === 't' || row.made_to_order === true } : {}),
}));
const query = async (sql: string, args: unknown[] = []) => normalize(await fixture.query(sql, args));
const count = async (table: string) => Number((await fixture.query('SELECT COUNT(*) AS n FROM ' + table))[0].n);
const jobs = () => query('SELECT * FROM payment_effect_outbox ORDER BY effect');
const stock = async () => Number((await fixture.query('SELECT SUM(quantity) AS n FROM merch_inventory_moves'))[0].n);

beforeAll(async () => {
  if (!enabled) return;
  fixture.start();
  await vi.waitFor(() => expect(fixture.ready()).toBe(true), { timeout: 10000 });
  await fixture.schema(`CREATE TABLE orders(id TEXT PRIMARY KEY,items JSONB NOT NULL,total INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',pay_method TEXT,paystack_ref TEXT,email TEXT,name TEXT,marketplace_event_id TEXT,
    mpesa_ref TEXT,mpesa_receipt TEXT,stripe_session TEXT,stripe_payment_intent TEXT);
    CREATE TABLE products(id TEXT PRIMARY KEY,inventory_tracked BOOLEAN NOT NULL,made_to_order BOOLEAN NOT NULL);
    CREATE TABLE merch_variants(id BIGSERIAL PRIMARY KEY,product_id TEXT REFERENCES products(id),label TEXT);
    CREATE TABLE merch_inventory_moves(id BIGSERIAL PRIMARY KEY,product_id TEXT REFERENCES products(id),
      variant_id BIGINT REFERENCES merch_variants(id),quantity INT,move_type TEXT,note TEXT,reference TEXT);
    CREATE UNIQUE INDEX fixture_online_sale_once ON merch_inventory_moves(product_id,COALESCE(variant_id,0),reference)
      WHERE move_type='online_sale' AND reference<>'';
    CREATE TABLE merch_fulfillments(order_id TEXT PRIMARY KEY REFERENCES orders(id));
    CREATE TABLE merch_order_settlements(order_id TEXT PRIMARY KEY REFERENCES orders(id));
    CREATE TABLE ticket_reservations(order_id TEXT,status TEXT);`);
  adapter.q.mockImplementation(query);
  adapter.qSchema.mockImplementation((sql: string) => fixture.schema(sql));
  adapter.db.mockImplementation(() => {
    const clients: ReturnType<DisposablePostgres['connect']>[] = [];
    return {
      query: async (sql: string, args: unknown[] = []) => ({ rows: await query(sql, args) }),
      connect: async () => {
        const client = fixture.connect(); clients.push(client);
        return { ...client, query: async (sql: string, args: unknown[] = []) => ({ rows: normalize((await client.query(sql, args)).rows) }) };
      },
      end: async () => { await Promise.all(clients.map(client => client.end())); },
    };
  });
  await ensurePaymentEffectsSchema();
  await ensureEmailOutbox();
  await ensureTicketSchema();
}, fixtureTimeout);
beforeEach(async () => {
  if (!enabled) return;
  adapter.q.mockImplementation(query);
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('network forbidden in isolated SQL tests'); }));
  await fixture.query(`TRUNCATE payment_effect_outbox,email_delivery_outbox,ticket_reservations,tickets,
    merch_inventory_moves,merch_variants,merch_fulfillments,merch_order_settlements,products,orders RESTART IDENTITY`);
  await fixture.query(`INSERT INTO orders(id,items,total,status,pay_method,paystack_ref,email,name)
    VALUES($1,$2::jsonb,1000,'pending','card',$1,'fixture@example.invalid','Local fixture')`, [id, JSON.stringify(lines)]);
  await fixture.query("INSERT INTO products VALUES('tee',true,false)");
  await fixture.query("INSERT INTO merch_inventory_moves(product_id,quantity,move_type,reference) VALUES('tee',10,'opening','fixture')");
  await fixture.query("INSERT INTO ticket_reservations(order_id,status) VALUES($1,'held')", [id]);
}, fixtureTimeout);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(() => { if (enabled) fixture.stop(); }, fixtureTimeout);

test('concurrent settlement creates one paid transition and one job per consequence', async () => {
  const settled = await Promise.all(Array.from({ length: 20 }, () => settlePaystackOrder(input)));
  expect(settled.filter(Boolean)).toHaveLength(1);
  expect((await jobs()).map(job => job.effect)).toEqual(['inventory', 'receipt', 'reservation', 'tickets']);
  expect((await query('SELECT status FROM orders'))[0].status).toBe('paid');
  expect(fetch).not.toHaveBeenCalled();
}, fixtureTimeout);

const rails = [
  { gateway: 'mpesa', prepare: "pay_method='mpesa',mpesa_ref='ws_CO_fixture'", settle: () => settleMpesaOrder({ orderId: id, checkoutRequestId: 'ws_CO_fixture', amountKes: 1000, receipt: 'RCP12345' }), wrongReference: "mpesa_ref='ws_CO_other'", wrongMethod: "pay_method='card'" },
  { gateway: 'stripe', prepare: "stripe_session='cs_fixture'", settle: () => settleStripeOrder({ orderId: id, sessionId: 'cs_fixture', paymentIntentId: 'pi_fixture', amountKes: 1000 }), wrongReference: "stripe_session='cs_other'", wrongMethod: "pay_method='mpesa'" },
];

test.each(rails)('$gateway concurrent settlement atomically records one job per consequence', async rail => {
  await fixture.query('UPDATE orders SET ' + rail.prepare);
  const settled = await Promise.all(Array.from({ length: 20 }, () => rail.settle()));
  expect(settled.filter(Boolean)).toHaveLength(1);
  expect((await jobs()).map(job => [job.gateway, job.effect])).toEqual([
    [rail.gateway, 'inventory'], [rail.gateway, 'receipt'], [rail.gateway, 'reservation'], [rail.gateway, 'tickets'],
  ]);
  expect((await query('SELECT status,mpesa_receipt,stripe_payment_intent FROM orders'))[0]).toMatchObject(
    rail.gateway === 'mpesa' ? { status: 'paid', mpesa_receipt: 'RCP12345' } : { status: 'paid', stripe_payment_intent: 'pi_fixture' },
  );
  expect(fetch).not.toHaveBeenCalled();
}, fixtureTimeout);

test.each(rails)('$gateway cannot settle a mismatched or terminal ledger', async rail => {
  for (const mismatch of [rail.wrongReference, rail.wrongMethod, 'total=999', "status='paid'", "status='refunded'", "status='failed'"]) {
    await fixture.query("UPDATE orders SET pay_method='card',total=1000,status='pending'");
    await fixture.query('UPDATE orders SET ' + rail.prepare);
    await fixture.query('UPDATE orders SET ' + mismatch);
    expect(await rail.settle()).toBeNull();
    expect(await count('payment_effect_outbox')).toBe(0);
  }
}, fixtureTimeout);

test.each(rails)('$gateway enqueue failure rolls back payment instead of losing fulfillment', async rail => {
  await fixture.query('UPDATE orders SET ' + rail.prepare);
  await fixture.schema(`CREATE FUNCTION reject_effect() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture_effect_rejected'; END $$;
    CREATE TRIGGER reject_effect BEFORE INSERT ON payment_effect_outbox FOR EACH ROW EXECUTE FUNCTION reject_effect()`);
  try {
    await expect(rail.settle()).rejects.toThrow();
    expect((await query('SELECT status FROM orders'))[0].status).toBe('pending');
    expect(await count('payment_effect_outbox')).toBe(0);
  } finally { await fixture.schema('DROP TRIGGER reject_effect ON payment_effect_outbox; DROP FUNCTION reject_effect()'); }
});

test.each(rails)('$gateway cold recovery keeps overlapping fulfillment idempotent', async rail => {
  await fixture.query('UPDATE orders SET ' + rail.prepare);
  await rail.settle();
  vi.resetModules();
  const cold = await import('@/lib/server/payment-effects');
  await Promise.all(Array.from({ length: 6 }, () => cold.processPaymentEffects()));
  await cold.processPaymentEffects();
  expect((await jobs()).every(job => job.status === 'complete')).toBe(true);
  expect(await stock()).toBe(8);
  expect(await count('merch_order_settlements')).toBe(1);
  expect(await count('email_delivery_outbox')).toBe(1);
  expect((await query('SELECT status FROM ticket_reservations'))[0].status).toBe('consumed');
}, fixtureTimeout);

test('widening the existing gateway constraint preserves already queued Paystack work', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE payment_effect_outbox SET attempts=2 WHERE effect='inventory'");
  await fixture.schema("ALTER TABLE payment_effect_outbox DROP CONSTRAINT payment_effect_outbox_gateway_check; ALTER TABLE payment_effect_outbox ADD CONSTRAINT payment_effect_outbox_gateway_check CHECK(gateway='paystack')");
  const before = await jobs();
  vi.resetModules();
  const cold = await import('@/lib/server/payment-effects');
  await cold.ensurePaymentEffectsSchema();
  expect(await jobs()).toEqual(before);
  await fixture.query("INSERT INTO orders(id,items,total,status,pay_method,mpesa_ref) VALUES('ORD-MIGRATE123','[]',1000,'pending','mpesa','ws_CO_migrate')");
  await cold.settleMpesaOrder({ orderId: 'ORD-MIGRATE123', checkoutRequestId: 'ws_CO_migrate', amountKes: 1000 });
  expect(Number((await fixture.query("SELECT COUNT(*) AS n FROM payment_effect_outbox WHERE gateway='mpesa'"))[0].n)).toBe(4);
}, fixtureTimeout);

test('the freshly committed receipt effect immediately attempts its durable email once', async () => {
  vi.stubEnv('RESEND_API_KEY', 'fixture-only-key');
  vi.mocked(fetch).mockImplementation(async () => {
    expect((await jobs()).find(job => job.effect === 'receipt')?.status).toBe('complete');
    return new Response('{"id":"fixture-provider-id"}', { status: 200 });
  });
  await settlePaystackOrder(input);
  await processPaymentEffects();
  expect(fetch).toHaveBeenCalledTimes(1);
  const delivery = (await query('SELECT * FROM email_delivery_outbox'))[0];
  expect(delivery).toMatchObject({ status: 'accepted', provider_id: 'fixture-provider-id' });
  expect((vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>)['Idempotency-Key']).toBe(delivery.id);
  await processPaymentEffects();
  expect(fetch).toHaveBeenCalledTimes(1);
}, fixtureTimeout);

test('an immediate email failure preserves confirmed payment and scheduled email recovery', async () => {
  vi.stubEnv('RESEND_API_KEY', 'fixture-only-key');
  vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
  await settlePaystackOrder(input);
  await processPaymentEffects();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect((await query('SELECT status FROM orders'))[0].status).toBe('paid');
  expect((await jobs()).find(job => job.effect === 'receipt')?.status).toBe('complete');
  expect((await query('SELECT status,last_error FROM email_delivery_outbox'))[0]).toMatchObject({ status: 'queued', last_error: 'provider_http_503' });
}, fixtureTimeout);

test.each(["status='paid'", "status='fulfilled'", "status='refunded'", "status='failed'",
  "pay_method='mpesa'", "paystack_ref='ORD-OTHER123'", 'total=999'])('does not queue work for an unmatched ledger: %s', async update => {
  await fixture.query('UPDATE orders SET ' + update);
  expect(await settlePaystackOrder(input)).toBeNull();
  expect(await count('payment_effect_outbox')).toBe(0);
});

test.each(['unknown', 'reconciling'])('accepts an exact recoverable %s ledger', async status => {
  await fixture.query('UPDATE orders SET status=$1', [status]);
  expect(await settlePaystackOrder(input)).toMatchObject({ id, status: 'paid' });
  expect(await count('payment_effect_outbox')).toBe(4);
});

test('an effect enqueue failure rolls back the paid transition', async () => {
  await fixture.schema(`CREATE FUNCTION reject_effect() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture_effect_rejected'; END $$;
    CREATE TRIGGER reject_effect BEFORE INSERT ON payment_effect_outbox FOR EACH ROW EXECUTE FUNCTION reject_effect()`);
  try {
    await expect(settlePaystackOrder(input)).rejects.toThrow();
    expect((await query('SELECT status FROM orders'))[0].status).toBe('pending');
    expect(await count('payment_effect_outbox')).toBe(0);
  } finally { await fixture.schema('DROP TRIGGER reject_effect ON payment_effect_outbox; DROP FUNCTION reject_effect()'); }
});

test('a cold cron resumes work persisted before the settlement Worker disappeared', async () => {
  await settlePaystackOrder(input);
  vi.resetModules();
  const cold = await import('@/lib/server/payment-effects');
  await cold.processPaymentEffects();
  expect((await jobs()).every(job => job.status === 'complete')).toBe(true);
  expect(await stock()).toBe(8);
  expect(await count('merch_fulfillments')).toBe(1);
  expect(await count('email_delivery_outbox')).toBe(1);
  expect((await query('SELECT status FROM ticket_reservations'))[0].status).toBe('consumed');
  expect(fetch).not.toHaveBeenCalled();
}, fixtureTimeout);

test('overlapping processors do not repeat stock or receipt consequences', async () => {
  await settlePaystackOrder(input);
  await Promise.all(Array.from({ length: 12 }, () => processPaymentEffects()));
  await processPaymentEffects();
  expect((await jobs()).every(job => job.status === 'complete')).toBe(true);
  expect(await stock()).toBe(8);
  expect(await count('merch_order_settlements')).toBe(1);
  expect(await count('email_delivery_outbox')).toBe(1);
}, fixtureTimeout);

test('an inventory failure remains retryable while other consequences complete', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE merch_inventory_moves SET quantity=1 WHERE move_type='opening'");
  const result = await processPaymentEffects();
  expect(result).toContainEqual({ orderId: id, effect: 'inventory', status: 'queued' });
  expect(await count('email_delivery_outbox')).toBe(1);
  const inventory = (await jobs()).find(job => job.effect === 'inventory')!;
  expect(inventory.last_error).toBe('effect_failed');
  await fixture.query("UPDATE merch_inventory_moves SET quantity=10 WHERE move_type='opening'");
  await fixture.query("UPDATE payment_effect_outbox SET next_attempt_at=now() WHERE effect='inventory'");
  await processPaymentEffects();
  expect(await stock()).toBe(8);
}, fixtureTimeout);

test('receipt enqueue waits for ticket work to finish', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE payment_effect_outbox SET status='processing',lease_token='other-worker',lease_until=now()+interval '5 minutes' WHERE effect='tickets'");
  await processPaymentEffects();
  expect(await count('email_delivery_outbox')).toBe(0);
  expect((await jobs()).find(job => job.effect === 'receipt')).toMatchObject({ status: 'queued', attempts: 0 });
  await fixture.query("UPDATE payment_effect_outbox SET status='complete',lease_token=NULL,lease_until=NULL WHERE effect='tickets'");
  await processPaymentEffects();
  expect(await count('email_delivery_outbox')).toBe(1);
}, fixtureTimeout);

test('ticket receipt work becomes durable only after every ticket has been minted', async () => {
  await fixture.query('UPDATE orders SET items=$1::jsonb', [JSON.stringify([{ id: 'ticket:event:0', qty: 2, unit: 500 }])]);
  await settlePaystackOrder(input);
  await fixture.schema(`CREATE FUNCTION require_tickets() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF (SELECT COUNT(*) FROM tickets WHERE order_id=NEW.order_id)<>2 THEN RAISE EXCEPTION 'fixture_tickets_missing'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER require_tickets BEFORE INSERT ON email_delivery_outbox FOR EACH ROW EXECUTE FUNCTION require_tickets()`);
  try {
    await processPaymentEffects();
    expect(await count('tickets')).toBe(2);
    expect(await count('email_delivery_outbox')).toBe(1);
    expect((await jobs()).every(job => job.status === 'complete')).toBe(true);
  } finally { await fixture.schema('DROP TRIGGER require_tickets ON email_delivery_outbox; DROP FUNCTION require_tickets()'); }
}, fixtureTimeout);

test('a suppressed receipt insertion stays retryable instead of acknowledging missing durable mail', async () => {
  await settlePaystackOrder(input);
  await fixture.schema(`CREATE FUNCTION suppress_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    CREATE TRIGGER suppress_receipt BEFORE INSERT ON email_delivery_outbox FOR EACH ROW EXECUTE FUNCTION suppress_receipt()`);
  try {
    expect(await processPaymentEffects()).toContainEqual({ orderId: id, effect: 'receipt', status: 'queued' });
    expect(await count('email_delivery_outbox')).toBe(0);
    expect((await jobs()).find(job => job.effect === 'receipt')).toMatchObject({ status: 'queued', last_error: 'effect_failed' });
  } finally { await fixture.schema('DROP TRIGGER suppress_receipt ON email_delivery_outbox; DROP FUNCTION suppress_receipt()'); }
}, fixtureTimeout);

test('orders without a usable customer address skip receipt work', async () => {
  await fixture.query('UPDATE orders SET email=NULL');
  await settlePaystackOrder(input);
  expect(await processPaymentEffects()).toContainEqual({ orderId: id, effect: 'receipt', status: 'skipped' });
  expect(await count('email_delivery_outbox')).toBe(0);
}, fixtureTimeout);

test.each(['inventory', 'receipt'])('a crash after %s commits replays without another consequence', async effect => {
  await settlePaystackOrder(input);
  await fixture.schema(`CREATE FUNCTION reject_completion() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.status='complete' AND NEW.effect='${effect}' THEN RAISE EXCEPTION 'fixture_completion_rejected'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_completion BEFORE UPDATE ON payment_effect_outbox FOR EACH ROW EXECUTE FUNCTION reject_completion()`);
  try { await expect(processPaymentEffects()).rejects.toThrow(); }
  finally { await fixture.schema('DROP TRIGGER reject_completion ON payment_effect_outbox; DROP FUNCTION reject_completion()'); }
  await fixture.query("UPDATE payment_effect_outbox SET lease_until=now()-interval '1 second' WHERE status='processing'");
  await processPaymentEffects();
  expect((await jobs()).every(job => job.status === 'complete')).toBe(true);
  expect(await stock()).toBe(8);
  expect(await count('merch_order_settlements')).toBe(1);
  expect(await count('email_delivery_outbox')).toBe(1);
}, fixtureTimeout);

test('a stale claimant cannot acknowledge a replacement lease', async () => {
  await settlePaystackOrder(input);
  let replaced = false;
  adapter.q.mockImplementation(async (sql: string, args: unknown[] = []) => {
    if (!replaced && sql.includes("SET status=$4") && args[1] === 'inventory' && args[3] === 'complete') {
      replaced = true;
      await fixture.query("UPDATE payment_effect_outbox SET lease_token='replacement',lease_until=now()+interval '5 minutes' WHERE effect='inventory'");
    }
    return query(sql, args);
  });
  expect(await processPaymentEffects()).toContainEqual({ orderId: id, effect: 'inventory', status: 'lease_lost' });
  expect((await jobs()).find(job => job.effect === 'inventory')).toMatchObject({ status: 'processing', lease_token: 'replacement' });
  expect(await stock()).toBe(8);
}, fixtureTimeout);

test('expired unsuccessful attempts are retained for review after the retry budget', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE merch_inventory_moves SET quantity=1 WHERE move_type='opening'");
  await fixture.query("UPDATE payment_effect_outbox SET attempts=7 WHERE effect='inventory'");
  expect(await processPaymentEffects()).toContainEqual({ orderId: id, effect: 'inventory', status: 'blocked' });
  expect(await processPaymentEffects()).toEqual([]);
  expect((await jobs()).find(job => job.effect === 'inventory')).toMatchObject({ status: 'blocked', attempts: 8 });
}, fixtureTimeout);

test('an expired final lease is blocked without a ninth operation attempt', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE payment_effect_outbox SET status='processing',attempts=8,lease_token='dead-worker',lease_until=now()-interval '1 second' WHERE effect='inventory'");
  expect(await processPaymentEffects()).toContainEqual({ orderId: id, effect: 'inventory', status: 'blocked' });
  expect(await stock()).toBe(10);
  expect((await jobs()).find(job => job.effect === 'inventory')).toMatchObject({ attempts: 8, status: 'blocked', lease_token: null });
}, fixtureTimeout);

test('terminal orders receive no delayed consequences and historical paid rows are never discovered', async () => {
  await settlePaystackOrder(input);
  await fixture.query("UPDATE orders SET status='refunded'");
  await processPaymentEffects();
  expect((await jobs()).every(job => job.status === 'skipped')).toBe(true);
  expect(await stock()).toBe(10);
  expect(await count('email_delivery_outbox')).toBe(0);
  await fixture.query('TRUNCATE payment_effect_outbox');
  await fixture.query("UPDATE orders SET status='paid'");
  expect(await processPaymentEffects()).toEqual([]);
  expect(await count('merch_order_settlements')).toBe(0);
}, fixtureTimeout);

test('inventory waits for the ledger lock and observes a refund committed ahead of replay', async () => {
  await settlePaystackOrder(input);
  const refund = fixture.connect();
  try {
    await refund.query('BEGIN');
    await refund.query("UPDATE orders SET status='refunded' WHERE id=$1", [id]);
    const work = recordPaidMerchOrder({ id, status: 'paid', items: lines });
    await vi.waitFor(async () => {
      const waiting = await fixture.query("SELECT COUNT(*) AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'EXECUTE fixture_%' AND pid<>pg_backend_pid()");
      expect(Number(waiting[0].n)).toBeGreaterThan(0);
    }, { timeout: 5000 });
    await refund.query('COMMIT');
    await work;
    expect(await stock()).toBe(10);
    expect(await count('merch_order_settlements')).toBe(0);
    expect(await count('merch_fulfillments')).toBe(0);
  } finally { await refund.end(); }
}, fixtureTimeout);
