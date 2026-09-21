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
 * Statuses a checkout may sell against. Exactly one: a ticket can only be sold
 * from a published event. sales_paused, sold_out, postponed, rescheduled,
 * cancelled, completed and archived all mean "do not take money for this".
 */
export const SELLABLE_EVENT_STATUSES: readonly EventStatus[] = ['published'];

export function isPubliclyVisible(status: unknown): boolean {
  return PUBLIC_EVENT_STATUSES.includes(status as EventStatus);
}

export function isSellable(status: unknown): boolean {
  return SELLABLE_EVENT_STATUSES.includes(status as EventStatus);
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

