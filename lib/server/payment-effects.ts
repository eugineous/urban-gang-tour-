import { randomUUID } from 'node:crypto';
import { hasDb, q, qSchema } from './db';
import type { OrderRow } from './receipt-email';
import { isConfirmedPayment, RECOVERABLE_PAYMENT_STATUSES } from './payment-status';
import { consumeReservation } from './ticket-inventory';
import { recordPaidMerchOrder } from './inventory';
import { ensureTickets } from './tickets';
import { enqueueReceiptEmail, ensureEmailOutbox } from './email-outbox';

export type PaymentEffect = 'reservation' | 'inventory' | 'tickets' | 'receipt';
export type EffectSummary = { orderId: string; effect: PaymentEffect; status: 'complete' | 'skipped' | 'queued' | 'blocked' | 'lease_lost' };
type EffectJob = { order_id: string; effect: PaymentEffect; attempts: number; lease_token: string };

// Queue storage failures must reach the authenticated cron's dependency guard.
// Provider/connection details never become durable errors or HTTP responses.
async function effectsQuery<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  try { return await q<T>(sql, args); }
  catch { throw new Error('database_unavailable'); }
}

let schemaReady: Promise<void> | undefined;
export async function ensurePaymentEffectsSchema(): Promise<void> {
  if (!hasDb()) throw new Error('db_not_configured');
  if (!schemaReady) schemaReady = qSchema(`CREATE TABLE IF NOT EXISTS payment_effect_outbox (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    effect TEXT NOT NULL CHECK(effect IN ('reservation','inventory','tickets','receipt')),
    gateway TEXT NOT NULL DEFAULT 'paystack' CHECK(gateway='paystack'),
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','complete','skipped','blocked')),
    attempts INT NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    lease_token TEXT, lease_until TIMESTAMPTZ, last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(order_id,effect)
  ); CREATE INDEX IF NOT EXISTS payment_effect_outbox_due ON payment_effect_outbox(status,next_attempt_at);`)
    .catch(() => { schemaReady = undefined; throw new Error('database_unavailable'); });
  return schemaReady;
}

// The sole enqueue source is this fresh, exact paid transition. In particular,
// neither initialization nor recovery scans historical paid orders for work.
export async function settlePaystackOrder(input: { orderId: string; reference: string; amountKes: number }): Promise<OrderRow | null> {
  if (!/^ORD-[A-Z0-9-]{4,40}$/.test(input.orderId) || !/^[A-Za-z0-9.=-]{1,100}$/.test(input.reference)
    || !Number.isSafeInteger(input.amountKes) || input.amountKes < 1 || input.amountKes > 2147483647) {
    throw new Error('invalid_paystack_settlement');
  }
  await ensurePaymentEffectsSchema();
  const rows = await effectsQuery<OrderRow>(`WITH paid AS (
    UPDATE orders SET status='paid'
    WHERE id=$1 AND paystack_ref=$2 AND total=$3 AND pay_method='card'
      AND status=ANY($4::text[]) RETURNING *
  ), queued AS (
    INSERT INTO payment_effect_outbox(order_id,effect)
    SELECT paid.id,effect.name FROM paid CROSS JOIN
      (VALUES ('reservation'),('inventory'),('tickets'),('receipt')) AS effect(name)
    ON CONFLICT(order_id,effect) DO NOTHING
  ) SELECT * FROM paid`, [input.orderId, input.reference, input.amountKes, RECOVERABLE_PAYMENT_STATUSES]);
  return rows[0] || null;
}

async function finishEffect(job: EffectJob, status: 'complete' | 'skipped' | 'queued' | 'blocked'): Promise<EffectSummary> {
  const delay = Math.min(3600, 30 * 2 ** Math.min(Number(job.attempts), 7));
  const saved = await effectsQuery(`UPDATE payment_effect_outbox SET status=$4,last_error=$5,
      next_attempt_at=CASE WHEN $4='queued' THEN now()+($6::int*interval '1 second') ELSE next_attempt_at END,
      lease_token=NULL,lease_until=NULL,updated_at=now()
    WHERE order_id=$1 AND effect=$2 AND lease_token=$3 AND status='processing' AND lease_until>now()
    RETURNING order_id`, [job.order_id, job.effect, job.lease_token, status,
    status === 'queued' || status === 'blocked' ? 'effect_failed' : null, delay]);
  return { orderId: job.order_id, effect: job.effect, status: saved.length ? status : 'lease_lost' };
}

export async function processPaymentEffects(limit = 25, orderId?: string): Promise<EffectSummary[]> {
  await ensurePaymentEffectsSchema();
  const batchSize = Math.min(100, Math.max(1, Math.trunc(Number.isFinite(limit) ? limit : 25)));
  // A worker can disappear on its final lease. Preserve that job for review
  // without permitting a ninth operation or revoking a live worker's lease.
  const exhausted = await effectsQuery<{ order_id: string; effect: PaymentEffect }>(`WITH exhausted AS (
    SELECT order_id,effect FROM payment_effect_outbox
    WHERE attempts>=8 AND ($2::text IS NULL OR order_id=$2)
      AND ((status='queued' AND next_attempt_at<=now()) OR (status='processing' AND lease_until<=now()))
    ORDER BY created_at,order_id,effect LIMIT $1 FOR UPDATE SKIP LOCKED
  ) UPDATE payment_effect_outbox e SET status='blocked',last_error='retry_budget_exhausted',
      lease_token=NULL,lease_until=NULL,updated_at=now()
    FROM exhausted x WHERE e.order_id=x.order_id AND e.effect=x.effect RETURNING e.order_id,e.effect`, [batchSize, orderId ?? null]);
  const outcomes: EffectSummary[] = exhausted.map(job => ({ orderId: job.order_id, effect: job.effect, status: 'blocked' }));
  while (outcomes.length < batchSize) {
    // One atomic claim at a time makes the receipt eligible in this same
    // invocation immediately after ticket work commits. Waiting receipts do
    // not consume their retry budget or prevent other orders from advancing.
    const claimed = await effectsQuery<EffectJob>(`WITH candidate AS (
      SELECT e.order_id,e.effect FROM payment_effect_outbox e
      WHERE e.attempts<8 AND ($2::text IS NULL OR e.order_id=$2)
        AND ((e.status='queued' AND e.next_attempt_at<=now()) OR (e.status='processing' AND e.lease_until<=now()))
        AND (e.effect<>'receipt' OR EXISTS (
          SELECT 1 FROM payment_effect_outbox t WHERE t.order_id=e.order_id AND t.effect='tickets' AND t.status='complete'
        ) OR NOT EXISTS (SELECT 1 FROM orders o WHERE o.id=e.order_id AND o.status IN ('paid','fulfilled')))
      ORDER BY e.created_at,e.order_id,CASE e.effect WHEN 'reservation' THEN 0 WHEN 'inventory' THEN 1 WHEN 'tickets' THEN 2 ELSE 3 END
      LIMIT 1 FOR UPDATE SKIP LOCKED
    ) UPDATE payment_effect_outbox e SET status='processing',attempts=e.attempts+1,
        lease_token=$1,lease_until=now()+interval '5 minutes',updated_at=now()
      FROM candidate c WHERE e.order_id=c.order_id AND e.effect=c.effect RETURNING e.*`, [randomUUID(), orderId ?? null]);
    const job = claimed[0];
    if (!job) break;
    const orders = await effectsQuery<OrderRow>('SELECT * FROM orders WHERE id=$1', [job.order_id]);
    const order = orders[0];
    if (!order || !isConfirmedPayment(order.status)
      || (job.effect === 'receipt' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(order.email || '').trim()))) {
      outcomes.push(await finishEffect(job, 'skipped'));
      continue;
    }
    if (job.effect === 'receipt') {
      // Schema initialization is infrastructure work, outside the operation
      // retry handler so an unavailable database remains an HTTP503.
      try { await ensureEmailOutbox(); }
      catch { throw new Error('database_unavailable'); }
    }
    let failed = false;
    let receiptId: string | undefined;
    // Only the consequence itself is caught. Claim, ledger-read and result
    // persistence failures must propagate; a committed consequence can replay
    // idempotently when its lease expires after a Worker interruption.
    try {
      if (job.effect === 'reservation') await consumeReservation(order.id);
      else if (job.effect === 'inventory') await recordPaidMerchOrder(order);
      else if (job.effect === 'tickets') await ensureTickets(order);
      else receiptId = await enqueueReceiptEmail(order.id);
    } catch { failed = true; }
    if (receiptId) {
      // enqueueReceiptEmail returns its deterministic identity even when its
      // guarded insert finds no eligible order. Only a real durable row counts.
      const delivery = await effectsQuery('SELECT id FROM email_delivery_outbox WHERE id=$1 AND order_id=$2 AND delivery=\'payment\'', [receiptId, order.id]);
      failed = delivery.length === 0;
    }
    outcomes.push(await finishEffect(job, failed ? Number(job.attempts) >= 8 ? 'blocked' : 'queued' : 'complete'));
  }
  return outcomes;
}
