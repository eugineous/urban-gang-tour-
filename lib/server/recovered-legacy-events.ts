// RECOVERED legacy events — evidence, not commercial truth.
//
// These three ticketed events are recovered from source history, NOT from a
// current operational confirmation. Existence in an old commit proves the rows
// once shipped; it does NOT prove the event, date, venue or price is valid to
// sell today. Everything downstream (checkout, Google indexing, buyer email,
// refunds) depends on keeping that distinction, so every record carries
// explicit provenance and a verification status that starts at `unverified`.
//
// Provenance
//   c276ecd  "Collapse hardcoded events/products into DB-backed admin CRUD"
//            carried these three as an idempotent seed with the exact field
//            values below, and its message records that price parity with the
//            previous hardcoded catalogue was verified against production
//            before cutover.
//   5b1bebc  "Remove stale catalog bootstrap fallbacks" later deleted that
//            seed, which left the catalogue with no ticketed rows at all.
//
// Corroboration (independent of the code, but still not an operational
// confirmation): live newsroom posts describe the same event, venue, date and
// payment flow — "Color Blast Tickets: M-Pesa and Card Payment Guide"
// (2026-08-02), "The Experience Hub: UGT's Dance & Hype Partner" (2026-08-05),
// "Ashton Sounds: The Stage & Sound Partner Behind UGT" (2026-09-09).
//
// The weekday labels in the original source do not agree with its own dates
// ("Sat 16 Aug 2026" was a Sunday, "Sat 20 Sep 2026" a Sunday, "Fri 3 Oct
// 2026" a Saturday). That inconsistency is recorded here rather than silently
// corrected — it is one of the reasons none of this may be auto-published.

import type { EventStatus } from './event-lifecycle';

/** How much trust a recovered record has earned from a human. */
export type VerificationStatus = 'unverified' | 'verified' | 'rejected';

export interface RecoveryProvenance {
  recovered_from_commit: string;
  recovered_at: string;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  recovery_notes: string;
}

export interface RecoveredLegacyEvent {
  id: string;
  kind: 'ticketed';
  name: string;
  /** Date exactly as it shipped. Not asserted to be the current schedule. */
  eventDate: string | null;
  eventTime: string;
  venue: string;
  city: string;
  accent: string;
  image: string;
  description: string;
  tiers: { name: string; price: number }[];
  provenance: RecoveryProvenance;
}

const RECOVERED_AT = '2026-09-21';
const RECOVERED_FROM = 'c276ecd';

function unverified(notes: string): RecoveryProvenance {
  return {
    recovered_from_commit: RECOVERED_FROM,
    recovered_at: RECOVERED_AT,
    verification_status: 'unverified',
    verified_at: null,
    verified_by: null,
    recovery_notes: notes,
  };
}

export const RECOVERED_LEGACY_EVENTS: RecoveredLegacyEvent[] = [
  {
    id: 'xp-dance',
    kind: 'ticketed',
    name: 'The Experience Hub Dance Event',
    eventDate: '2026-08-16',
    eventTime: '2:00 PM',
    venue: 'KICC Grounds',
    city: 'Nairobi',
    accent: '#E6218C',
    image: '/assets/gal/xp-dance.jpg',
    description:
      'The dance takeover — crews, cyphers, hype sets and celebrity performances.',
    tiers: [
      { name: 'Regular', price: 500 },
      { name: 'VIP', price: 1500 },
      { name: 'VVIP Table', price: 5000 },
    ],
    provenance: unverified(
      'Shipped as "Sat 16 Aug 2026" (that date was a Sunday). Newsroom describes it in the past tense ("held at KICC in August 2026"), but no operational record has been checked.',
    ),
  },
  {
    id: 'festival-colours',
    kind: 'ticketed',
    name: 'Urban Festival Of Colours',
    eventDate: '2026-09-20',
    eventTime: '11:00 AM',
    venue: 'Uhuru Gardens',
    city: 'Nairobi',
    accent: '#21C7E6',
    image: '/assets/gal/festival-colours.jpg',
    description:
      'One field, a thousand colours, dancers, DJs and non-stop hype.',
    tiers: [
      { name: 'Early Bird', price: 800 },
      { name: 'Regular', price: 1200 },
      { name: 'VIP', price: 3000 },
    ],
    provenance: unverified(
      'Shipped as "Sat 20 Sep 2026" (that date was a Sunday). Best-corroborated of the three — 15+ live newsroom posts name this venue and date — but it is still a code/history record, not a confirmed event.',
    ),
  },
  {
    id: 'campus-rave',
    kind: 'ticketed',
    name: 'Campus Rave — Nairobi Edition',
    eventDate: '2026-10-03',
    eventTime: '4:00 PM',
    venue: 'Carnivore Grounds',
    city: 'Nairobi',
    accent: '#FFD400',
    image: '/assets/gal/campus-rave.jpg',
    description:
      'The tour, fully grown. Bigger stage, bigger sound, broadcast-ready.',
    tiers: [
      { name: 'Regular', price: 1000 },
      { name: 'VIP', price: 2500 },
      { name: 'VVIP', price: 6000 },
    ],
    provenance: unverified(
      'Shipped as "Fri 3 Oct 2026" (that date was a Saturday). The future-dated one, and the least corroborated: the newsroom refers to Campus Rave as a series and to "Campus Rave editions" without confirming this date. Must not be published until a human confirms it is on.',
    ),
  },
];

/**
 * Shape/values check for the recovery payload. Pure, so it is unit-testable
 * without a database — see __tests__/recovery-integrity.test.ts.
 */
export function validateRecoveredEvents(
  events: RecoveredLegacyEvent[] = RECOVERED_LEGACY_EVENTS,
): { ok: true } | { ok: false, errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id)) errors.push(`duplicate id: ${e.id}`);
    seen.add(e.id);
    if (!/^[a-z0-9-]{2,60}$/.test(e.id)) errors.push(`bad id: ${e.id}`);
    if (e.kind !== 'ticketed') errors.push(`bad kind: ${e.id}`);
    if (!e.name.trim()) errors.push(`missing name: ${e.id}`);
    if (e.eventDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(e.eventDate))
      errors.push(`bad date: ${e.id}`);
    if (!e.tiers.length || e.tiers.length > 12)
      errors.push(`bad tier count: ${e.id}`);
    for (const t of e.tiers) {
      if (!t.name.trim()) errors.push(`empty tier name: ${e.id}`);
      if (!Number.isSafeInteger(t.price) || t.price < 0)
        errors.push(`bad tier price: ${e.id}/${t.name}`);
    }
    if (e.provenance.verification_status !== 'unverified')
      errors.push(`recovered record must start unverified: ${e.id}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * The status a recovered record is written with. Never `published`: a past
 * date becomes an honest historical record, a future date stays a draft
 * pending human confirmation.
 */
export function recoveredStatus(
  event: RecoveredLegacyEvent,
  today: string,
): EventStatus {
  if (!event.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate))
    return 'draft';
  return event.eventDate < today ? 'completed' : 'draft';
}
