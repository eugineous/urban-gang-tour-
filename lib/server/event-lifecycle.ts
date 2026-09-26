// The event lifecycle, in one place.
//
// Before this file the status set was re-typed inline at each call site — the
// admin save handler kept its own four-value list, the public read kept its
// own, and nothing expressed the difference between "not yet public", "public
// and buyable", and "public but not buyable". Those are three different
// questions and conflating them is how a cancelled event stays sellable.
//
// Statuses follow the required set. Google's Event structured data maps
// EventScheduled / EventPostponed / EventRescheduled / EventCancelled — see
// app/_lib/jsonld.ts, which must agree with this file.

export const EVENT_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'sales_paused',
  'sold_out',
  'postponed',
  'rescheduled',
  'cancelled',
  'completed',
  'archived',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export function isEventStatus(v: unknown): v is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(String(v));
}

/**
 * Statuses whose rows may leave the database on a public surface at all.
 * A draft, an event awaiting review, an archived record and a cancelled event
 * must never be readable by an anonymous visitor — not by id-guessing, not
 * through the API, not through the sitemap.
 *
 * `postponed` / `rescheduled` / `sales_paused` / `sold_out` are deliberately
 * PUBLIC: buyers already holding tickets must be able to see what happened to
 * their event. They are simply not buyable — see SELLABLE_STATUSES.
 */
export const PUBLIC_EVENT_STATUSES: readonly EventStatus[] = [
  'published',
  'sales_paused',
  'sold_out',
  'postponed',
  'rescheduled',
  'completed',
];

/**
 * Statuses that belong in public search discovery surfaces: sitemap,
 * canonical event metadata and Event JSON-LD.
 *
 * This is narrower than PUBLIC_EVENT_STATUSES. Completed events may remain
 * readable for ticket holders, but they are not active discovery inventory.
 * Cancelled events stay out of anonymous public surfaces in this app, so a
 * crawler should never be handed a cancelled event URL that detail rendering
 * will reject.
 */
export const INDEXABLE_EVENT_STATUSES: readonly EventStatus[] = [
  'published',
  'sales_paused',
  'sold_out',
  'postponed',
  'rescheduled',
];

/**
 * Statuses a checkout may sell against. Exactly one: a ticket can only be sold
 * from a published event. sales_paused, sold_out, postponed, rescheduled,
 * cancelled, completed and archived all mean "do not take money for this".
 */
export const SELLABLE_EVENT_STATUSES: readonly EventStatus[] = ['published'];

export function isPubliclyVisible(status: unknown): boolean {
  return PUBLIC_EVENT_STATUSES.includes(status as EventStatus);
}

export function isEventIndexable(status: unknown): boolean {
  return INDEXABLE_EVENT_STATUSES.includes(status as EventStatus);
}

export function isSellable(status: unknown): boolean {
  return SELLABLE_EVENT_STATUSES.includes(status as EventStatus);
}

/**
 * Whether a checkout may take money for a TICKET to this event right now.
 *
 * Three independent conditions, and all three matter:
 *   1. the lifecycle permits selling (only `published`),
 *   2. the row is actually a ticketed event — a published school stop carries
 *      status='published' only because that is what makes it visible, and
 *      nothing about it is a purchasable ticket,
 *   3. there is at least one tier to sell — an event with no priced tiers has
 *      nothing a checkout could charge for.
 *
 * Keep this the only implementation: the public site-data route derives its
 * `sellable` flag from it, and so must any future checkout guard.
 */
export function isEventSellable(row: {
  status: unknown;
  kind?: unknown;
  tiers?: unknown;
}): boolean {
  return (
    isSellable(row.status) &&
    row.kind === 'ticketed' &&
    Array.isArray(row.tiers) &&
    row.tiers.length > 0
  );
}

/**
 * The structured-data state for an event, per Google's Event schema
 * (eventStatus). Only cancelled/postponed/rescheduled differ from scheduled.
 */
export function eventSchemaStatus(status: unknown): string {
  switch (status) {
    case 'cancelled':
      return 'https://schema.org/EventCancelled';
    case 'postponed':
      return 'https://schema.org/EventPostponed';
    case 'rescheduled':
      return 'https://schema.org/EventRescheduled';
    default:
      return 'https://schema.org/EventScheduled';
  }
}

