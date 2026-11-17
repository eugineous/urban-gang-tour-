# Marketplace ticket reliability

The owner explicitly chose implementing UGT improvements after the Little Events
comparison. No partnership/outreach/provider switch is in scope. The standing
consolidated instruction permits inline execution without repeated approval loops.

## Outcome

An outside organizer's customer can use Paystack card or mobile_money, retain one
payment reference through interruption, receive only paid valid entitlements, and
recover the same accepted purchase. Marketplace capacity and accepted commercial
terms remain stable while customers pay. Existing owned-ticket/merchandise flows,
accounts and data retain their contracts. Default/actual commission is not lowered.

## Current defects and design

The legacy marketplace creates a new weak reference per call, has no durable
attempt/hold, treats uncertain initialization as failed and mints against mutable
tier labels. Reuse the established signed checkout session and Paystack attempt
ledger; add a separate immutable marketplace purchase snapshot and capacity adapter.
Do not send marketplace IDs to owned helpers hardcoded to tour_events.

Persist organizer, event/tier identity/names, quantity, unit/total KES, commission
percentage/amounts, accepted subaccount, fee bearer and channels before dispatch.
Use organizer → event → order → prepared attempt lock order consistently, plus an
atomic capacity hold and one provider-send claim. Recover accepted terms on retry;
after any possible provider dispatch, cancellation/timeout cannot allow a resend.
Fail closed on failed commission lookup; absence of a setting may use the existing
8% default, but outage must not invent a commercial rate.

Marketplace tiers need explicit finite capacities before new safe sales. Never
invent capacities for old records. Material edits must share the event lock and
respect unresolved payable sessions/paid-before-mint obligations. Mint from the
accepted snapshot; preserve historical orders on an explicit legacy path.

Verified settlement handles recognized marketplace snapshots before generic
settlement, validates money/reference/currency and atomically records paid state
and outbox jobs. Duplicate callbacks/reconciliation cannot issue again. Paid money
that cannot safely fulfil is recorded as paid/refund_review, with no excess tickets
or automatic refund promise. Receipt waits for ticket preparation. Preserve the
existing conservative policy for uncertain hosted holds pending authoritative
resolution; document this operational dependency.

Paystack's current official split API accepts subaccount, transaction_charge and
bearer; initialize requests card + mobile_money using the accepted split snapshot.
This does not certify the merchant's mobile-money/subaccount settlement readiness.
No direct Daraja, Little gateway or other payment fallback is introduced.

## Customer experience

BuyBox uses the existing stable attempt helper and signed guest session. Reused
keys with changed requests conflict; a saved uncertain shop/marketplace payment is
recovered rather than replaced. Labels describe Paystack and supported payment
choices, not a guessed actual payment rail. Native accounts remain optional.
Use the established magenta UI and six-language catalogues, accessible targets and
reduced motion. No generic redesign or unverified event/stock claims.

## Constraints and proof

- Preserve existing records, IDs, prices/commission rules, bindings, cron and launch
  flags. Owned-ticket launch stays closed without independent readiness evidence.
- No live charges/STKs/messages/accounts/keys/events, secret/billing changes or new
  paid services. Provider interaction in tests is simulated; SQL fixtures have no network.
- Prove duplicate submission/response loss/changed-key conflict, immutable accepted
  split and tiers, concurrent final seats, organizer edits versus holds/settlement,
  incorrect/duplicate/late/refunded money and mint-before-receipt in real PostgreSQL.
- Root owns final integration, review, one combined suite/build and normal reviewed
  PR/keep-vars release. Independent writers own isolated worktrees and scoped tests.

## Adjacent independent corrections

CookieConsent's global automatic panel ignores private-route campaign policy.
Reuse that policy, keep explicit footer settings available and never infer consent.
Gate transport errors must be shown as unverified, not invalid; safe retry/outcome
communication must avoid encouraging a second admission. These do not manufacture
offline admission, provider readiness or a million-user capacity claim.

School/group registration and offline admission are distinct follow-on designs.
Minimize student data and preserve guest purchasing; any delivery must state its
actual group/venue limits. Do not certify disconnected multi-gate anti-replay from
QR signatures alone or distribute server signing secrets to phones.
