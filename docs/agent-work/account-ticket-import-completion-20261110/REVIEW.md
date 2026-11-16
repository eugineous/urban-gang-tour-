# Integrated release review — 16 November 2026

Independent read-only reviewer examined base1782934 through7038f0c and all root
tracked/untracked changes. No production transactions, messages or writes were
used. The interrupted review resumed in the same seat; no duplicate review pass.

Strengths recorded: preserved canonical account identities, encrypted durable
recovery/proof delivery, session/key revocation, actual verified WebAuthn,
capability-and-email-proven guest claims, bounded account-owned history and
hold-before-dispatch/mint-before-receipt ticket settlement.

No Critical issue. One Important: stale same-attempt ticket retry locked order
then already-sent attempt, while saving authorization locked attempt then order.
Root added a synchronized independent-session PostgreSQL test. It reproduced an
actual deadlock before the fix (completion-ticket-lock-red.log). Filtering the
locking claim by state='prepared' removes the conflicting sent-attempt lock.
Root owns the GREEN test and final checks; no second review was requested.

Minor: event checkout excluded itself from Paystack mobile-money wording despite
initializing both card/mobile_money. Removed the exclusion and asserted actual
event checkout's provider-neutral instruction/button in the client test.

Declined-to-judge rulings:

- Production merchant/webhook acceptance: retain existing payment flags and the
  separate closed owned-ticket launch gate; no live financial test authorized.
- Production schema/release gates: root verifies packaged endpoints, private
  responses, normal PR merge, keep-vars deployment and bindings/cron comparison.
- Ten-million-customer capacity: no such claim; runtime limiter proofs measure
  only that subsystem and bounded synthetic load.
- Media destination readiness: user requests an R2 alternative. Discovery is not
  a working migration; dedicated Supabase project organization choice is pending.

Review verdict was withhold merge until Important correction and verification.
Root accepts the finding and the above concrete correction; final evidence is
recorded in CHECKPOINT.md and the release report after actual commands finish.
