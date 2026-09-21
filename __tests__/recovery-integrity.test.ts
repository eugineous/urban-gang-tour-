import { describe, it, expect } from 'vitest';
import {
  RECOVERED_LEGACY_EVENTS,
  recoveredStatus,
  validateRecoveredEvents,
  type RecoveredLegacyEvent,
} from '@/lib/server/recovered-legacy-events';
import {
  EVENT_STATUSES,
  PUBLIC_EVENT_STATUSES,
  SELLABLE_EVENT_STATUSES,
  eventSchemaStatus,
  isEventStatus,
  isPubliclyVisible,
  isSellable,
} from '@/lib/server/event-lifecycle';

const TODAY = '2026-09-21';

describe('recovery payload integrity', () => {
  it('passes its own validator', () => {
    expect(validateRecoveredEvents()).toEqual({ ok: true });
  });

  it('has no duplicate ids (a second run cannot duplicate events)', () => {
    const ids = RECOVERED_LEGACY_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts every recovered record unverified — recovered is not verified', () => {
    for (const e of RECOVERED_LEGACY_EVENTS)
      expect(e.provenance.verification_status).toBe('unverified');
  });

  it('records provenance for every recovered record', () => {
    for (const e of RECOVERED_LEGACY_EVENTS) {
      expect(e.provenance.recovered_from_commit).toMatch(/^[0-9a-f]{7,40}$/);
      expect(e.provenance.recovered_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.provenance.verified_at).toBeNull();
      expect(e.provenance.verified_by).toBeNull();
      expect(e.provenance.recovery_notes).not.toBe('');
    }
  });

  it('carries real, positive, integer tier prices', () => {
    for (const e of RECOVERED_LEGACY_EVENTS) {
      expect(e.tiers.length).toBeGreaterThan(0);
      for (const t of e.tiers) {
        expect(t.name.trim()).not.toBe('');
        expect(Number.isSafeInteger(t.price)).toBe(true);
        expect(t.price).toBeGreaterThan(0);
      }
    }
  });

  it('rejects a payload that would restore a duplicate id', () => {
    const dup: RecoveredLegacyEvent = { ...RECOVERED_LEGACY_EVENTS[0] };
    const res = validateRecoveredEvents([...RECOVERED_LEGACY_EVENTS, dup]);
    expect(res.ok).toBe(false);
  });

  it('rejects a payload claiming to be already verified', () => {
    const fake: RecoveredLegacyEvent = {
      ...RECOVERED_LEGACY_EVENTS[0],
      provenance: { ...RECOVERED_LEGACY_EVENTS[0].provenance, verification_status: 'verified' },
    };
    expect(validateRecoveredEvents([fake]).ok).toBe(false);
  });

  it('rejects a negative or non-integer tier price', () => {
    const bad: RecoveredLegacyEvent = {
      ...RECOVERED_LEGACY_EVENTS[0],
      tiers: [{ name: 'Regular', price: -1 }],
    };
    expect(validateRecoveredEvents([bad]).ok).toBe(false);
  });
});

describe('recovery lifecycle status', () => {
  it('never restores an event as published (past or future)', () => {
    for (const e of RECOVERED_LEGACY_EVENTS) {
      const s = recoveredStatus(e, TODAY);
      expect(s).not.toBe('published');
    }
  });

  it('records a past date as completed', () => {
    const past = RECOVERED_LEGACY_EVENTS.find((e) => e.eventDate === '2026-08-16')!;
    expect(recoveredStatus(past, TODAY)).toBe('completed');
  });

  it('keeps an unconfirmed future date as draft, not published', () => {
    const future = RECOVERED_LEGACY_EVENTS.find((e) => e.eventDate === '2026-10-03')!;
    expect(future.eventDate! > TODAY).toBe(true);
    expect(recoveredStatus(future, TODAY)).toBe('draft');
  });

  it('keeps a dateless event as draft', () => {
    const dateless: RecoveredLegacyEvent = { ...RECOVERED_LEGACY_EVENTS[0], eventDate: null };
    expect(recoveredStatus(dateless, TODAY)).toBe('draft');
  });

  it('is deterministic — the same input always yields the same status', () => {
    for (const e of RECOVERED_LEGACY_EVENTS)
      expect(recoveredStatus(e, TODAY)).toBe(recoveredStatus(e, TODAY));
  });

  it('treats an event dated today as still upcoming (draft), never completed', () => {
    const today = { ...RECOVERED_LEGACY_EVENTS[0], eventDate: TODAY };
    expect(recoveredStatus(today, TODAY)).toBe('draft');
  });
});

describe('event lifecycle: public visibility vs sellability', () => {
  it('only published is sellable', () => {
    expect([...SELLABLE_EVENT_STATUSES]).toEqual(['published']);
    for (const s of EVENT_STATUSES)
      expect(isSellable(s)).toBe(s === 'published');
  });

  it('never sells from an unreviewed, cancelled, archived or past event', () => {
    for (const s of ['draft', 'pending_review', 'cancelled', 'archived', 'completed'] as const)
      expect(isSellable(s)).toBe(false);
  });

  it('keeps draft, pending_review, cancelled and archived off every public surface', () => {
    for (const s of ['draft', 'pending_review', 'cancelled', 'archived'] as const)
      expect(isPubliclyVisible(s)).toBe(false);
  });

  it('exposes postponed/rescheduled/sold_out publicly so existing buyers can see the change', () => {
    for (const s of ['postponed', 'rescheduled', 'sold_out', 'sales_paused'] as const)
      expect(isPubliclyVisible(s)).toBe(true);
  });

  it('public and sellable are different questions — sellable is a strict subset', () => {
    for (const s of SELLABLE_EVENT_STATUSES)
      expect(isPubliclyVisible(s)).toBe(true);
    expect(SELLABLE_EVENT_STATUSES.length).toBeLessThan(PUBLIC_EVENT_STATUSES.length);
  });

  it('rejects an unknown status string', () => {
    expect(isEventStatus('live')).toBe(false);
    expect(isEventStatus('')).toBe(false);
    expect(isEventStatus(undefined)).toBe(false);
    expect(isEventStatus('published')).toBe(true);
  });

  it('maps each lifecycle state onto Google Event eventStatus', () => {
    expect(eventSchemaStatus('published')).toBe('https://schema.org/EventScheduled');
    expect(eventSchemaStatus('postponed')).toBe('https://schema.org/EventPostponed');
    expect(eventSchemaStatus('rescheduled')).toBe('https://schema.org/EventRescheduled');
    expect(eventSchemaStatus('cancelled')).toBe('https://schema.org/EventCancelled');
    // A sold-out or completed event is still a scheduled event — it is the
    // offer availability, not the event status, that changes.
    for (const s of ['sold_out', 'completed', 'sales_paused'] as const)
      expect(eventSchemaStatus(s)).toBe('https://schema.org/EventScheduled');
  });
});
