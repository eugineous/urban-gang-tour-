# Current unfinished-work register — 21 October 2026

This inventory checks today's code against older promises. It is not a claim
that old reports are the current state, nor a rendered/device/provider audit.

Already implemented: durable M-Pesa initiation/recovery, atomic ticket holds,
allocated refunds, receipt delivery outbox, buyer password recovery, story
history/restore, media folders/bulk operations and all63 completed scheduled
guides. Do not rebuild these as though absent.

## UI recovery release

Owner reported desktop hamburger, lost Let's talk entry points, unaligned
footer, dormant pop-ups, missing FAQ and weak/missing home motion/sections.
Header/desktop-secondary/mobile navigation, scoped grouped footer, direct
contact launcher, consent-aware host invitation and home section/motion
restoration are the current bounded implementation. Active live ad content is
not fabricated: the public campaigns API returned an empty active set.

Nixtio is an interaction/hierarchy reference, not permission to copy its agency
claims, client endorsements, metrics or testimonials into Urban Gang Tour.

## Next: transaction integrity (separate risk-tested changes)

1. Card retry/recovery: Paystack/Stripe checkout routes create new order IDs
   per request; provider keys based on those IDs do not recover a buyer retry.
   Add persistent buyer-bound attempt identity and lost-response/concurrency
   tests across both rails. See app/api/{paystack,stripe}/checkout/route.ts.
2. Merchandise reservation: availability is read before payment; deduction is
   locked after settlement. Two accepted payments for the last item can still
   require manual fulfilment/refund. Add real stock/variant holds and safe
   uncertain-payment expiry/reconciliation. See lib/server/inventory.ts and
   app/api/orders/route.ts. Do not alter confirmed customer payments in tests.
3. Paid-order consequences: callback failures in stock/ticket/receipt setup can
   occur after paid state; unpaid-only reconciliation misses that work. Add an
   atomically journalled fulfilment job with retry-safe workers, never recharge.
   Existing receipt outbox is not proof that enqueue itself cannot be lost.
   See app/api/mpesa/callback/route.ts and lib/server/reconcile.ts.

## Remaining operational work

- Event/photo unsaved edits need private, versioned autosave/reopen; current
  navigation warnings preserve saved records but not typing across a refresh.
  See app/admin/ops/Events.tsx, app/admin/MediaDesk.tsx and
  lib/client/use-unsaved-warning.ts.
- Website Studio edits five allowed content pages, not every website surface.
  Extend deliberate versioned publishing to navigation/footer/archive/legal
  surfaces rather than describing it as a full website builder.
  See lib/website-content.ts.
- Link booking/client/public event/operating event deliberately, then crew,
  call sheets, safety/run-of-show and finance without collapsing permissions.
  See lib/server/ops.ts and app/admin/ops/EventOperations.tsx.
- CI/recovery: no repository workflows; CSV table exports are not a consistent
  database backup or tested schema/media restore. Add reliable gates and an
  isolated restore drill before making disaster-recovery promises.
- Language catalogue is not translated product coverage. Prioritize reviewed
  locale resources, locale-preserving flows and safe translation expansion;
  checkout/legal/admin are not fully translated.
- Measure real caption/transcript coverage and fill actual missing tracks.
  Caption import infrastructure is not proof every video is accessible.

## Verification still required

Connected Android/iOS/foldable/tablet/desktop reflow/keyboard/modals, Gallery
hydration reproduction, provider sandbox payment/mail workflows, QR/PDF device
checks and authorized mixed-load measurements. Rate-limiter decision counts
are not40,000 whole-site requests/minute certification. No live financial test,
customer message, auth bypass or invented provider success is authorized here.
