// Canonical order/payment states. The ledger used to accept any string from
// the Control Room. That is how a success boolean masquerades as a finance
// system: "refunded" could be typed in without a ledger row, tickets, or a
// matching amount.
//
// These values are the ONLY strings checkout, callbacks, admin, and ticket
// minting may write. Existing rows already use pending/paid/failed/fulfilled
// — those stay in the set so we do not rewrite live history.

export const ORDER_STATUSES = [
  'created',
  'initiated',
  'pending',
  'paid',
  'declined',
  'timed_out',
  'unknown',
  'reconciling',
  'refunded',
  'partially_refunded',
  'failed',
  'fulfilled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(String(v));
}

/** Money has been confirmed by a provider. Tickets may be minted. */
export const CONFIRMED_PAYMENT_STATUSES: readonly OrderStatus[] = ['paid', 'fulfilled'];

export function isConfirmedPayment(status: unknown): boolean {
  return CONFIRMED_PAYMENT_STATUSES.includes(status as OrderStatus);
}

/** Terminal unsuccessful outcomes. Checkout must not mint tickets. */
export const FAILED_PAYMENT_STATUSES: readonly OrderStatus[] = [
  'declined',
  'timed_out',
  'failed',
];

export function isFailedPayment(status: unknown): boolean {
  return FAILED_PAYMENT_STATUSES.includes(status as OrderStatus);
}

// Provider callbacks and the reconciliation sweep may only settle a row that
// is still awaiting an authoritative provider outcome. In particular, a
// terminal failed/refunded/fulfilled row must never be reopened by a delayed
// or replayed success webhook.
export const RECOVERABLE_PAYMENT_STATUSES: readonly OrderStatus[] = [
  'pending',
  'unknown',
  'reconciling',
];

export function canProviderConfirmPayment(status: unknown): boolean {
  return RECOVERABLE_PAYMENT_STATUSES.includes(status as OrderStatus);
}

/**
 * Allowed admin/manual transitions. Provider callbacks use their own
 * fail-closed UPDATE ... WHERE status IN (...) rather than this map, so a
 * replay cannot reopen a paid row.
 */
export const ADMIN_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ['initiated', 'pending', 'failed'],
  initiated: ['pending', 'timed_out', 'failed', 'unknown'],
  pending: ['paid', 'declined', 'timed_out', 'failed', 'unknown', 'reconciling'],
  reconciling: ['paid', 'declined', 'timed_out', 'failed', 'unknown'],
  unknown: ['paid', 'declined', 'timed_out', 'failed', 'reconciling'],
  paid: ['fulfilled', 'refunded', 'partially_refunded'],
  fulfilled: ['refunded', 'partially_refunded'],
  declined: [],
  timed_out: ['pending'],
  failed: ['pending'],
  refunded: [],
  partially_refunded: ['refunded'],
};

export function canAdminSetOrderStatus(from: unknown, to: unknown): boolean {
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false;
  if (from === to) return true;
  return ADMIN_ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Amount matching for a provider callback. Units must already be KES integers
 * on both sides — callers convert Paystack subunits before calling this.
 */
export function amountsMatch(orderTotal: unknown, providerAmount: unknown): boolean {
  const a = Number(orderTotal);
  const b = Number(providerAmount);
  return Number.isSafeInteger(a) && Number.isSafeInteger(b) && a > 0 && a === b;
}
