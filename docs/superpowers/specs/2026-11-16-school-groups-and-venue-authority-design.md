# Individual, school-group and venue admission follow-on

Status: design for the next implementation, not shipped functionality. The owner
confirmed both individual and school-group purchases and asked for the best
online/offline approach, including a shared Wi-Fi admission log. No Little pilot
or provider change is requested. Existing launch and merchant readiness gates stay.

## Selected approach

Keep the cloud as the normal admission authority. For a venue outage, use one
locally hosted transactional authority shared by every scanner on venue Wi-Fi.
The cloud hands off an event exclusively; phones never invent independent offline
green results. This supports multi-gate deduplication without a new paid service.

Always-online with backup cellular connectivity is simpler and should remain the
normal operation. Independent offline phone manifests are easier to distribute,
but cannot stop one ticket being admitted simultaneously at disconnected gates.
They are unsuitable as the default fallback.

## Paid attendance contracts

An individual buyer or teacher must be an authorized adult contact. A school-group
purchase collects institution, role, aggregate admissions and adult authority
confirmation, alongside the existing purchaser/delivery contact. It does not
collect children's names, birth dates, contact details, medical information or
guardian documents. Ticket purchase is not photography or marketing consent.

Use one admission and one distinct QR per person. The adult is the booking contact;
individual tickets use ordinal labels. Teachers/chaperones require admissions
unless an explicitly configured published tier provides otherwise. A group order
reference does not admit an unlimited party or consume all admissions at once.

Existing informational school events do not become sellable automatically. A
school programme can link to an explicitly configured admission event only after
server validation of its identity, date, venue, finite capacity and published tiers.

Preserve the public individual limit. For larger groups, an authorized operator
creates an expiring purchase offer bound to the adult guest principal/account,
event, tier and exact quantity. The offer preserves published prices and current
commission, reserves no imaginary stock and cannot bypass launch gates. Choose a
finite technical maximum from measured mint/pack throughput before exposing it.

Prepare the offer identity and adult attendance context atomically with the
accepted order snapshot. Include them in the idempotency fingerprint. Hold the
entire quantity under the existing event/order/attempt locks before Paystack
dispatch. Keep one payment reference through interruption. An offer timeout must
not release an unresolved dispatched purchase. Settlement issues the paid quantity
once or records paid/refund-review; it never issues excess admission or starts a
series of automatic smaller payments.

Large groups receive a protected asynchronously generated multipage ticket pack,
plus individual ticket links. Retain guest capability/owner authorization. Avoid
hundreds of individual email attachments or one synchronous PDF request per seat.

Likely boundaries: shared attendance-context validator/schema; group purchase-offer
service and protected admin issuance; LiveCommerce/marketplace purchase controls;
accepted payment snapshots; capacity ledger; mint/outbox; private order-ticket page;
bulk PDF generator/delivery; six-language catalogues. Integrate with the new durable
marketplace adapter rather than the superseded legacy controller.

## Event-scoped and idempotent admission

Before local operation, extend online admission with canonical event identity,
strong scan request ID and authority epoch. Enforce staff authorization for the
selected event. A request ID is bound to event, code and scanner identity. Retries
of an identical request return its recorded result, marked as a recovered check;
reuse for another code/event conflicts. The scanner keeps the same ID after a
lost response, with explicit instructions to admit the attendee only once.

Persist scan outcome and ticket consumption in one transaction. Check current
paid/unvoided state and event identity before consuming. Unknown transport remains
paused; a cached screen, queued request or signature alone does not authorize entry.

## Exclusive cloud/local authority

Persist an event state machine `cloud → preparing → local → reconciling → cloud`
with monotonic epochs. Handoff authenticates the operator/hub, fences cloud scans,
drains in-flight transactions and produces a coherent entitlement/used-state
watermark. No automatic fallback to cloud while a local authority may still admit.

Export a versioned, asymmetrically signed manifest containing event, hub, epoch,
manifest ID, watermark, issue/expiry bounds, record digest, eligible admissions,
used state and void/revocation tombstones. Include only opaque ticket digests,
tier and necessary ordinal metadata. Buyer contacts and child records are absent.
Use separate provisioned signing credentials and pinned public verification keys;
never export SESSION_SECRET, provider credentials or database access.

The local hub validates the manifest, authorization and expiry. It commits ticket
consumption and the idempotent response into a durable transactional journal
before returning green. All gate phones use this same authority. Losing Wi-Fi or
the hub pauses admission. Do not elect a second hub or restore a backup as another
active authority without a fenced recovery procedure.

Reconcile through a dedicated authenticated append-only endpoint, not by replaying
ordinary scan requests. Records carry event, epoch, hub, sequence, request identity,
ticket digest, original timestamp and outcome. Verify signatures/continuity,
deduplicate replay and surface conflicting records. Resume cloud only after full
acknowledgement and confirmed local closure. Expiry alone never reopens cloud
admission while an unaccounted hub may remain active.

## Stale entitlement and venue prerequisites

An offline hub cannot learn newly issued tickets, later refunds or revocations.
The operator must explicitly configure a bounded stale-state window and expiry;
the hub stops when it expires. If current refund/revocation state is required for
every admission, keep connectivity or fail closed. Do not promise that an offline
signature supplies current financial truth.

Commissioning requires owned hardware, power backup, Wi-Fi coverage, encrypted
local storage/backups, operator access controls and provisioned device credentials.
Camera use requires trusted HTTPS; an HTTPS website cannot simply fetch an
insecure local-IP service. Pair and verify the hub origin/certificate on staff
devices, without disabling browser certificate validation or mixed-content rules.
Offline revocation of a stolen hub is bounded by expiry, not instantaneous.

Provide a staffed exception lane and written lost-hub recovery procedure. Equipment,
credentials and a venue drill cannot be inferred from a successful code deployment.

## Proof required before launch

- Groups above 20: exact quantity/pricing/split, adult-only data, principal-bound
  offer authorization/expiry, final-capacity races, duplicate/interrupted payments,
  late money, exact mint counts and bulk pack access/bounded throughput.
- Online gates: wrong-event refusal, assigned staff, duplicate concurrent scans,
  durable identical retries, changed request-ID conflicts and response loss.
- Local gates: tampered/expired/wrong-event manifests, cloud handoff races,
  concurrent gates, journal power-loss recovery, partitioned phones, stale
  revocation behavior, incomplete reconciliation, stolen hub and failed closure.
- Rehearse the real venue with at least two scanners and actual connectivity/power
  interruptions, using isolated fixture admissions and no customer ticket data.

Implement paid groups and event-scoped online contracts first. Package the venue
hub and protocol separately, then commission it. Until those steps pass, the
released scanner continues to require online verification.
