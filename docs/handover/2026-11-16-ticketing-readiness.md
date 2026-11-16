# Ticketing reliability and venue readiness

## What this release changes

Private ticket, order and account routes suppress automatic consent prompts.
Saved preferences are retained; deliberate privacy settings remain available.
Private routes do not grant optional analytics or advertising permission.

Gate checks distinguish an invalid/used ticket from a missing or unreliable
response. An unknown result pauses the scanner until staff explicitly retry or
move the attendee to the exception lane. The original server update may already
have succeeded; a subsequent “already used” response is not a second admission.
Voided tickets are identified before a historical admission is displayed.

## Before taking payments for an event

Confirm the event, date, venue, approved organizer, explicit tier capacities,
prices and accepted commercial terms. Missing legacy capacities must be configured
explicitly; this release does not invent available seats or change prices.

Paystack card and mobile_money are requested. The owner has confirmed M-Pesa is
enabled, but that alone does not prove every organizer subaccount can settle that
rail with the accepted split. Confirm that combination with Paystack before
advertising it for the organizer. No Daraja fallback is permitted.

Rehearse callback/reconciliation, delayed confirmation, duplicate notifications,
late success, refund review, ticket delivery/recovery and reconciliation exports
in isolated/test environments. A browser redirect is not proof of payment.
Uncertain hosted sessions retain capacity until authoritative resolution; do not
release holds simply because a customer closes a window or the local timer expires.
Review unresolved payments and paid orders awaiting fulfilment promptly.

The owned-ticket launch gate remains unchanged. Code deployment is not launch
approval, a successful real payment or settlement certification.

## Gate operation in this release

Use authenticated staff accounts with gate_scanner permission. Admission requires
the online database. Provide backup mobile connectivity and a staffed exception
lane; do not interpret cached pages, screenshots or signed PDF facts as admission.
Keep private contact lookup limited to an operational need and hide it afterward.

Before doors open, test valid, used, voided and unpaid tickets, an expired staff
session, connection loss after submission and recovery with the supervisor.
An actual venue/network and multi-gate rehearsal has not been completed here.

## School groups and local fallback

The owner selects both individual adult purchases and adult-led school groups.
Current school-kind pages remain informational; an enquiry is not a paid group
registration. The existing public ticket quantity limit remains in place until
the separate group purchase contract is implemented and verified.

Recommended group contract: one verified adult contact, school/organization,
attendee count and one distinct admission per person. Avoid children's names,
birth dates or accounts for ordinary ticket entry. Keep guest ticket recovery.
Do not imply a group QR admits an unbounded or partly tracked group.

Recommended outage architecture: one local venue authority on shared Wi-Fi with
an exclusive event handoff from the cloud, a bounded signed manifest and durable
admission log. Online-to-local transfer must fence cloud writes before offline
admission begins; reconnect/revoke requires reconciliation before cloud resumes.
Independent disconnected phones cannot prevent cross-gate reuse. Offline phones
must pause or use a separately controlled supervisor exception process.

This release does not ship a local server, offline admission or a student roster.
These require a distinct design, equipment setup, security tests and venue drill.
