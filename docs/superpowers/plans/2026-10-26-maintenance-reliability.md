# Maintenance Monitoring and Receipt Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing scheduled maintenance observable and receipt acknowledgement truthful, without introducing financial replay or new outbound communications.

**Architecture:** A dependency-free shared monitor projects the existing five cron responses into bounded private KV records. A super-admin-only status API/panel shows current-slot results and complete queue aggregates. Receipt processing retains its frozen payload/key/window while requiring both a valid provider acknowledgement and a lease-owned durable acceptance update.

**Tech Stack:** Existing Cloudflare Worker/KV/self-reference binding, Next.js server routes, PostgreSQL, Node Vitest and the approved local browser/Miniflare fixtures. No new binding, cron, provider, credential or dependency.

**Spec:** `docs/superpowers/specs/2026-10-26-english-first-automation-design.md`, Delivery B; approved by the owner on 26 October 2026.

## Global Constraints

- Preserve the existing five jobs, secret, bindings and 15-minute schedule.
- Store one bounded completion record per allowlisted job under `operations/cron/v1/{job}`.
- Cap response bytes at 64KiB before JSON parsing. Never store raw responses, customer/order IDs, email addresses, tokens or driver errors in monitoring records.
- Use a 180-second observation deadline; a timeout does not prove the underlying job had no effects. A late response cannot replace timeout/unknown or reset freshness.
- A run is fresh for at most 35 minutes from its start, not late completion. Allow five minutes after the latest expected UTC quarter-hour before marking its missing result unknown.
- No job is automatically replayed by the monitor. Existing natural scheduled runs and the jobs' own idempotency rules remain unchanged.
- Expose only authenticated, rate-limited, super-admin GET monitoring with private/no-store on every branch; no new public write endpoint or admin trigger.
- Preserve payload, provider key, lease, attempt cap, backoff and the 20-hour safe receipt retry window. After that window, require operator review.
- Refresh visible panels every 60 seconds, pause while hidden/unmounted, avoid overlap and clear private state on loss of authorization.
- Do not scan old paid orders and resend receipts, recharge, reopen refunded orders, invent stock or treat insufficient inventory as resolved.
- The retired p1–p14 products stay retired; Color Blast remains preview-only. No live receipt/STK/charge/refund/message is sent as a test.

## Review Focus

1. HTTP200 with missing/malformed fields, deliberate HTTP503 social disablement and configured-but-failing DB work must not be conflated with success or empty work. Tasks 1 and 3 own these tests.
2. A late response, future timestamp, stale KV read or failed current-slot write must not make an older success look current. Tasks 1, 2 and 5 own these tests.
3. Provider acceptance followed by a lost lease/DB failure must never claim durable acceptance or create a new resend identity. Task 4 owns these tests.
4. Older queue failures beyond the newest100, unknown stored states and partial module failures must stay visible without exposing payloads/contacts. Tasks 5–6 own these tests.
5. Hidden tabs, authorization loss and racing/aborted refreshes must not leak stale private state, duplicate requests or disable the existing jobs when monitoring is unavailable. Tasks 2, 6 and 7 own these tests.

---

## Execution boundaries and file responsibilities

This plan can be reviewed independently from the native-language plan; execute it after that delivery unless the owner chooses a different order. Capture the actual starting commit in `docs/agent-work/maintenance/CHECKPOINT.md`. Keep one writer in this worktree, task commits and a final whole-branch acceptance gate.

New files:

- `lib/operations-monitor.mjs`, `lib/operations-monitor.d.mts`: portable job allowlist, projection/validation/freshness, bounded reader and observer; no Next/Node/Cloudflare imports.
- `lib/server/operations-status.ts`: five exact private KV reads and sanitized summary.
- `app/api/admin/operations-status/route.ts`: GET-only, verified super-admin gate and rate limit.
- `app/admin/OperationsStatusPanel.tsx`: English staff UI in the existing owner-only area.
- `lib/shared/email-queue-stats.ts`: shared queue summary type and safe count/timestamp parsing.
- `lib/client/visible-poller.ts`: reusable visibility/abort/no-overlap polling lifecycle.

Existing responsibilities remain in place: Worker constructs authenticated self-reference requests; cron routes retain authentication/job invocation; email modules own queues; AdminApp owns permission-gated placement. Do not combine the monitor with editorial approval or payment execution.

## Task 1: Portable records, response projection and freshness policy

**Files:** Create `lib/operations-monitor.mjs`, `lib/operations-monitor.d.mts`, `__tests__/operations-monitor-policy.test.ts`, `__tests__/operations-monitor-reader.test.ts`.

**Interfaces:** Produce the following exact public module contracts. These are TypeScript declarations for a plain ESM implementation consumed by both Worker and Next server code:

```ts
export const CRON_JOBS:readonly [
  'content-announcements','ticket-sweeper','payment-reconcile','email-delivery','editorial'
];
export type CronJob=typeof CRON_JOBS[number];
export type CronOutcome='succeeded'|'disabled'|'attention'|'blocked'|'failed'|'unknown';
export type CronError='scheduler_unconfigured'|'unauthorized'|'http_failure'|
  'invalid_response'|'dependency_unavailable'|'deadline_exceeded'|'fetch_failed'|null;
export type CronCounts=Readonly<Record<string,number>>;
export interface CronRecord {
  version:1;job:CronJob;scheduled_at:string;started_at:string;finished_at:string;
  duration_ms:number;http_status:number|null;outcome:CronOutcome;
  counts:CronCounts;error:CronError;
}
export interface CronEntry {
  job:CronJob;state:'current'|'awaiting'|'unknown'|'stale';
  record:CronRecord|null;age_seconds:number|null;
}
export function readBoundedJson(response:Response,maxBytes?:number):Promise<unknown>;
export function projectCronResponse(job:CronJob,status:number,payload:unknown):{
  outcome:CronOutcome;counts:CronCounts;error:CronError
};
export function parseCronRecord(job:CronJob,raw:string|null,nowMs:number):CronRecord|null;
export function classifyCronRecord(job:CronJob,record:CronRecord|null,nowMs:number):CronEntry;
```

Record counts use a fixed per-job key allowlist. Values must be safe nonnegative integers; never stringify/spread incoming objects or retain array values. Monitor record JSON is capped at 8KiB, separate from the 64KiB response cap. Record schemas reject unknown top-level fields, job/key mismatch, invalid dates, future times, impossible ordering and unsafe numeric values.

- [ ] **Write failing policy cases for every job shape and five Review Focus inputs.** Concrete projection examples:

```ts
expect(projectCronResponse('ticket-sweeper',200,{ok:true,expired:2}))
 .toEqual({outcome:'succeeded',counts:{expired:2},error:null});
expect(projectCronResponse('content-announcements',503,{error:'automation_disabled'}).outcome)
 .toBe('disabled');
expect(projectCronResponse('payment-reconcile',200,{
 ok:true,checked:2,paid:['private-A'],failed:[],stillPending:['private-B'],skipped:[]
}).counts).toEqual({checked:2,paid:1,declined:0,unresolved:1,skipped:0});
expect(projectCronResponse('ticket-sweeper',200,{ok:true}).outcome).toBe('unknown');
```

Build a valid record fixture with UTC scheduled/start/finish timestamps and exercise current slot, grace awaiting, grace exceeded unknown, 35-minute age, future times and malformed counts. Verify serialized projections contain none of the fictional IDs/contact/token fields injected into source payloads.

- [ ] **Run RED:** `npx vitest run --no-cache __tests__/operations-monitor-policy.test.ts __tests__/operations-monitor-reader.test.ts`; verify missing-contract failures, not unavailable test infrastructure.
- [ ] **Implement bounded streaming JSON.** Count Uint8Array bytes before decoding/parsing; do not trust Content-Length or JS string length. Cancel an oversized reader and reject empty/malformed UTF-8/JSON. Require no more than 65536 bytes; tests include multibyte text crossing the boundary and a stream that yields multiple chunks.

```js
const reader=response.body.getReader();
const chunks=[];let size=0;
try {
  for (;;) {
    const {done,value}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>maxBytes){await reader.cancel();throw Error('invalid_response');}
    chunks.push(value);
  }
} finally {reader.releaseLock();}
```

Finish this reader by joining exactly `size` bytes, decoding with fatal UTF-8 handling and JSON.parse. Never include decoded body/error details in thrown monitoring diagnostics.

- [ ] **Implement the per-job projection table below.** Extra source fields may be ignored but cannot substitute for required typed fields or be persisted. Unknown outcome/status values become unknown/attention, not successful processing.

| Job | Required normal fields and persisted counts |
| --- | --- |
| content-announcements | `ok:true`, integer `scanned/posted/held`, boolean `disabled`; counts retain these three numbers. Gate-off HTTP503 `automation_disabled` is disabled. `disabled:true` after the owner gate means readiness missing, so blocked. `held>0` is attention. |
| ticket-sweeper | `ok:true`, integer `expired`; persist expired only. |
| payment-reconcile | `ok:true`, integer checked and arrays paid/failed/stillPending/skipped; persist array lengths as paid/declined/unresolved/skipped. Unresolved/skipped means attention. Customer declines are not job failures. |
| email-delivery | boolean ok, receipt/contact outcome arrays, module_errors object. Persist counts for allowlisted statuses accepted/queued/processing/blocked/failed/not_due/lease_lost, each with receipt/contact prefix. Unknown acceptance or module errors remain attention/failure. Discard IDs. |
| editorial | `ok:true`, integer released/held; persist these and whitelisted staged counts/conflicts. For library, `conflicts` is a private slug array: retain its length only. Other staged operations use integer conflicts. Never spread library/completion/approval/artwork/retirement objects. |

For editorial staged results, permit only numeric fields named inserted, unchanged, superseded, approved, completed, updated, retired, already, conflicts, under the corresponding fixed prefix; require valid `staged` and validate conflicts when staged. `staged:false` has no work counts. Ignore completed/expired operator identity fields, not their privacy guards. Do not treat old manifest expiry as permission to retry. Held/conflicting work is visible attention without changing publication predicates.

Known finite dependency codes map to blocked; generic HTTP failures map to failed. Authentication failure maps unauthorized; bad/missing JSON contracts map unknown/invalid_response. Project valid partial email outcome counts even for its HTTP503 reply, then retain the finite module failure; do not discard all useful outcomes at an early non-2xx check. A job may have performed partial work before failure; no projection authorizes replay.

- [ ] **Implement freshness using start time and latest expected UTC slot.** Slot interval900000ms; grace300000ms; stale2100000ms. A current-slot valid result can be current. An older result is only last-known history: show awaiting during the new slot's grace, unknown afterward, stale when its start is older than35 minutes. Reject future/impossible timestamps. Do not reset age from finish time.
- [ ] **Run GREEN and declaration checks:** focused policy/reader tests, `npx tsc --noEmit`; ensure Worker module imports no Node/Next library.
- [ ] **Commit** with message `Add bounded private cron monitoring policy`.

## Task 2: Observe existing dispatches without changing execution authority

**Files:** Extend `lib/operations-monitor.mjs` and `.d.mts`; modify only scheduled dispatch in `worker-runtime.mjs`; create `__tests__/operations-monitor-dispatch.test.ts`. Preserve existing public fetch/cache/retired-product behavior.

**Interfaces:** Task 1 plus:

```ts
export interface CronStore {put(key:string,value:string):Promise<void>}
export function observeCronJob(job:CronJob,options:{
  scheduledAt:number;request:()=>Promise<Response>;store:CronStore|null;
  now:()=>number;deadlineMs?:number
}):Promise<{record:CronRecord;persisted:boolean}>;
```

The production deadline is180000ms; the override is a local test seam, not a new environment setting. Missing observer storage must not stop the existing maintenance requests.

- [ ] **Write failing dispatcher tests with no network.** Mock all five self-reference calls to HTTP503, collect waitUntil promises and require five failed records, not five implied successes. Assert exact job URLs, POST, existing header name and no output containing the fictional secret.

```ts
const now=Date.parse('2026-10-26T12:00:00.000Z');
const savedRecords:CronRecord[]=[];
const env={UGT_CRON_SECRET:'fictional-local-cron-key',
 UGT_MEDIA:{put:async(_key:string,value:string)=>{savedRecords.push(JSON.parse(value));}},
 WORKER_SELF_REFERENCE:{fetch:vi.fn(async()=>Response.json({error:'fixture_failure'},{status:503}))}
};
const worker=createWorker({fetch:vi.fn()});
const tasks:Promise<unknown>[]=[];
await worker.scheduled({scheduledTime:now},env,{waitUntil:p=>tasks.push(p)});
await Promise.allSettled(tasks);
expect(env.WORKER_SELF_REFERENCE.fetch).toHaveBeenCalledTimes(5);
expect(savedRecords).toHaveLength(5);
expect(savedRecords.every(record=>record.outcome==='failed')).toBe(true);
```

Import createWorker from the actual Worker module and use fake system time matching now; no real credentials. Add missing secret, missing self-reference, missing KV, KV put failure and one-job rejection cases.
- [ ] **Run RED:** dispatch tests plus existing `edge-public-cache`, `legacy-product-worker-guard`, `editorial-cron` tests.
- [ ] **Implement a single observation race covering fetch and bounded body parsing.** Use injected `now` and real production timers. Write one final record after the winning result; clear the deadline timer. A late promise is consumed but has no write handler. Timeout becomes unknown/deadline_exceeded, not proof of no effects; do not retry or restart it.
- [ ] **Keep authenticated request construction in Worker scheduled.** Use existing env secret and self-reference, the exact five job names and controller.scheduledTime. Missing dispatch credentials produce blocked records if monitoring storage exists, without creating a request. Missing KV still dispatches the configured jobs and logs one finite monitoring diagnostic, never raw errors.

```js
ctx.waitUntil(observeCronJob(job,{
  scheduledAt:controller.scheduledTime,
  request:()=>env.WORKER_SELF_REFERENCE.fetch(new Request(
    'https://urbangangtour.co.ke/api/internal/cron/'+job,
    {method:'POST',headers:{'x-ugt-cron':env.UGT_CRON_SECRET}}
  )),
  store:env.UGT_MEDIA||null,now:Date.now
}));
```

Wrap the missing-secret/self-reference branches explicitly before this call; do not call undefined bindings. Keep one waitUntil per job so another job's failure cannot prevent registration. Whether the observer resolves or rejects is not job-health evidence: tests inspect persisted outcomes. Log a finite `monitor_write_failed` on put failure and return `persisted:false`; the latest-slot policy prevents older data claiming current health after grace.

- [ ] **Run GREEN with fake timers:** advance through180 seconds instantly, resolve/reject the late request afterward, and require exactly one unknown completion record with the original start. Check five independent keys, no same-key start/finish burst and unchanged cron schedule/bindings.

```ts
vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
const writes:string[]=[];
let finish!:(response:Response)=>void;
const pending=new Promise<Response>(resolve=>{finish=resolve;});
const observed=observeCronJob('ticket-sweeper',{
 scheduledAt:Date.now(),request:()=>pending,now:Date.now,
 store:{put:async(_key,value)=>{writes.push(value);}}
});
await vi.advanceTimersByTimeAsync(180001);
expect((await observed).record.error).toBe('deadline_exceeded');
finish(Response.json({ok:true,expired:1}));
await Promise.resolve();expect(writes).toHaveLength(1);
vi.useRealTimers();
```
- [ ] **Commit** with message `Monitor existing scheduled jobs without replaying work`.

## Task 3: Correct false-empty cron dependency results

**Files:** Modify `lib/server/reconcile.ts`, `lib/server/ticket-inventory.ts`, `app/api/internal/cron/payment-reconcile/route.ts`, `app/api/internal/cron/ticket-sweeper/route.ts`; create `__tests__/cron-dependencies.test.ts`. Keep existing `payment-recovery-fulfillment` and `ticket-reservation-postgres.integration` tests.

**Interfaces:** Preserve `reconcileStuckOrders(limit=25):Promise<ReconcileOutcome>` and `expireStaleReservations():Promise<number>` on success. Failure rejects with a finite diagnostic at the route boundary, rather than looking like an empty successful run.

- [ ] **Write failing helper and route tests:** absent DB, configured DB with rejected initial SELECT, rejected sweep query and genuinely empty successful results. Assert no provider request on initial DB failure and no raw driver content in replies.

```ts
const authenticatedFictionalRequest=()=>new Request(
 'https://urbangangtour.co.ke/api/internal/cron/payment-reconcile',
 {method:'POST',headers:{'x-ugt-cron':'fictional-local-cron-key'}}
);
vi.stubEnv('UGT_CRON_SECRET','fictional-local-cron-key');
vi.mocked(hasDb).mockReturnValue(false);
await expect(reconcileStuckOrders()).rejects.toThrow('db_not_configured');
await expect(expireStaleReservations()).rejects.toThrow('db_not_configured');
vi.mocked(hasDb).mockReturnValue(true);
vi.mocked(q).mockRejectedValueOnce(Error('private database detail'));
const response=await reconcileRoute(authenticatedFictionalRequest());
expect(response.status).toBe(503);
expect(await response.text()).not.toContain('private database detail');
```

The fixture request is local unit-test input, not a production session. Import `POST as reconcileRoute` from the payment-reconcile route, and the two helpers and `hasDb/q` from the files named in this task. Hoist database/schema/rate-limit mocks, stub all provider/network calls to local failures, and reset schema/module/mock state between missing/query-failure/empty cases. Restore environment variables afterward.
- [ ] **Run RED:** the new dependency suite.
- [ ] **Make only the diagnostic changes:** throw `db_not_configured` where the helpers currently return empty/0; replace reconciliation's initial SELECT `.catch(()=>[])` with a finite `database_unavailable` rejection. Classify a rejected reservation work query the same way. Preserve selection, limit, payment states, provider calls, settlement side effects and the exact reservation-expiry UPDATE predicate. Schema failures may use generic job_failed503, never success.
- [ ] **Sanitize the two cron catches and apply no-store on every response.** Return `{error:'database_unavailable'}` for missing/failing database work and `{error:'job_failed'}` for other unexpected execution failures, with503; never serialize error.message. Preserve timing-safe secret checks and existing authorization status codes. No preliminary ping masking a failing actual query.
- [ ] **Run GREEN and finance preservation checks:** dependency suite, existing payment recovery test and explicit isolated PostgreSQL reservation tests. Use only `UGT_EDITORIAL_SQL_CONTAINER=ugt-editorial-fixture-20261019`; inspect its local network-none setup and follow cloud runtime Docker guidance first. No production DATABASE_URL or provider call.
- [ ] **Commit** with message `Report unavailable cron dependencies instead of empty success`.

## Task 4: Valid, durably acknowledged receipt acceptance

**Files:** Modify `lib/server/email-outbox.ts`; extend `__tests__/receipt-email-outbox.test.ts`; add actual-SQL lease assertions to `__tests__/receipt-acceptance-postgres.integration.test.ts`. Contact delivery remains the reference; do not change contact delivery behavior just to share code.

**Interfaces:** Preserve enqueue, processor, retry and stable job ID APIs. The acceptance branch must receive a valid provider ID and match the processing lease in its UPDATE before returning accepted. Lost lease returns `lease_lost`; persistence failure remains uncertain under the same job identity.

- [ ] **Write failing acknowledgement cases:** missing/empty/null/oversized/invalid ID, malformed JSON, provider2xx with no ID, acceptance UPDATE returning zero rows and UPDATE rejecting after provider success. Preserve frozen request body and Idempotency-Key across retries.
- [ ] **Update only misleading fixtures before RED:** existing receipt tests use `{}` as accepted and return no rows for acceptance updates. Replace the normal success response with `{id:'fixture-provider-id'}` and a matched `RETURNING id` row; make zero-row and missing-ID cases explicit regressions, not weakened success expectations.
- [ ] **Run RED:** receipt outbox suite and new lease tests (isolated SQL only).
- [ ] **Implement the acceptance predicate and durable match.** Reuse the contact ID grammar, not its unchecked return assumption:

```ts
const providerId=typeof data.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(data.id)
  ?data.id:null;
if(!providerId){error='provider_acceptance_unconfirmed';throw Error(error);}
const accepted=await q(`UPDATE email_delivery_outbox SET status='accepted',provider_id=$3,
 last_error=NULL,lease_until=NULL,lease_token=NULL,updated_at=now()
 WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id`,[id,token,providerId]);
if(!accepted.length)return 'lease_lost';
return 'accepted';
```

Before the UPDATE, set the finite error classification to `provider_acceptance_unconfirmed` so a persistence failure after send is not mislabeled preparation failure. Keep all catch/update writes lease-owned. Do not create another job, refresh first_send_at, reset attempts or resend with a fresh key. If recording the retry itself fails, propagate a sanitized route failure rather than claim success.

- [ ] **Run GREEN and invariants:** same payload/key after uncertain acceptance, accepted-job no-resend, lease stolen while provider pending, expiry at20 hours and attempt8 stopping for review, provider permanent/transient failures. In PostgreSQL tests assert the rejected old lease cannot modify the new owner's row; all network is mocked.
- [ ] **Commit** with message `Require valid durable provider acknowledgement for receipts`.

## Task 5: Private status API and full queue aggregate contracts

**Files:** Create `lib/server/operations-status.ts`, `app/api/admin/operations-status/route.ts`, `lib/shared/email-queue-stats.ts`, `__tests__/operations-status.test.ts`, `__tests__/email-queue-stats-postgres.integration.test.ts`; modify `lib/server/{email-outbox,contact-email-outbox}.ts`, `app/api/admin/email-delivery/route.ts`, `app/api/health/route.ts`, relevant API.md sections. Extend `email-queue-independence`, media/privacy tests.

**Interfaces:** Consume Task 1 classifications. `readOperationsStatus(nowMs?:number):Promise<OperationsStatus>` reads exactly the five fixed KV keys. Declare `OperationsStatus` in the portable `.d.mts` so the client imports its type only:

```ts
export interface OperationsStatus {
  ok:boolean;checked_at:string;summary:'ok'|'attention'|'awaiting'|'unavailable';
  scheduler_configured:boolean;jobs:readonly CronEntry[];
  financial_recovery:'separate_design_required';
}
export type EmailQueueStatus='queued'|'processing'|'blocked'|'accepted'|'failed'|'unknown';
export interface EmailQueueStats {
  total:number;counts:Record<EmailQueueStatus,number>;due:number;
  oldestDueAt:string|null;reviewRequired:number;legacyAcceptedUnconfirmed:number;
}
export function receiptEmailQueueStats():Promise<EmailQueueStats>;
export function contactEmailQueueStats():Promise<EmailQueueStats>;
```

The two aggregate functions are exported from their corresponding existing queue modules, not the shared type file. `ok` in OperationsStatus means records were retrievable, not that jobs/payments are healthy; UI uses summary/entry states. Binding/read failure yields503 with safe unavailable structure. Known failed or awaiting jobs may return200 data with a non-ok summary.

- [ ] **Write failing auth/privacy/status tests:** public and crew403 before KV/DB access; verified super-admin success; rate-limit429; missing KV; malformed/oversized records; partial read errors; expected-slot grace/future timestamps; no secret/contact/ID fields. Every response must be private/no-store, including failures.
- [ ] **Run RED:** new operations status tests plus `email-queue-independence` tests extended for aggregate fields.
- [ ] **Implement the five-read adapter and GET-only route.** Follow editorial-library's getCloudflareContext adapter, not a browser KV client. Gate `await verifyAdminSession(req)` then `isSuperAdmin(req)` before reads; use existing per-device public/admin-read rate limiting with req. No POST or arbitrary key parameter.

```ts
const headers={'Cache-Control':'private, no-store','Cloudflare-CDN-Cache-Control':'no-store'};
if(!(await verifyAdminSession(req))||!isSuperAdmin(req))
 return NextResponse.json({error:'forbidden'},{status:403,headers});
```

Read all five independently; inaccessible entries are unknown, never empty success. Summary describes monitored jobs only and includes the financial-recovery advisory. Keep public `/api/health` backwards-compatible and explicitly identify its response as liveness/configuration-only; do not add provider pings or expose private monitoring there.

- [ ] **Implement aggregate queries over the entire tables.** Keep list APIs' newest100 unchanged. Parse PostgreSQL COUNT strings only into safe nonnegative integers. Eligible due rows must satisfy current worker conditions: queued/blocked next_attempt_at due or processing lease expired, attempts<8 and first_send_at null or newer than20 hours. `oldestDueAt` is the minimum created_at among those eligible rows, null if none.

```sql
COUNT(*) FILTER (WHERE status='queued') AS queued,
COUNT(*) FILTER (WHERE status IS NULL OR status NOT IN ('queued','processing','blocked','accepted','failed')) AS unknown,
COUNT(*) FILTER (WHERE status='accepted' AND
 (provider_id IS NULL OR provider_id !~ '^[a-zA-Z0-9_-]{1,100}$')) AS legacy_unconfirmed
```

Include total and every known status count. `reviewRequired` counts failed/unknown states, active rows beyond retry limits/window, and legacy acceptance without confirmation, using an OR predicate to avoid double counting. No row mutation/backfill occurs. Tests include more than100 jobs, old failures, expired processing leases, future due dates, unsafe windows and invalid stored states.

- [ ] **Extend the email GET independently for four data sources.** Use Promise.allSettled for receipt list, contact list, receipt stats and contact stats. Preserve available lists when their aggregate fails. Add `receipt_stats`, `contact_stats`, `checked_at`; failed stats are null with finite `module_errors.receipt_stats/contact_stats` codes. Existing configured/jobs/contact_jobs fields remain intact. Apply private/no-store to all GET and existing POST branches without changing POST retry permission/origin/body rules.
- [ ] **Run GREEN:** new auth/stats tests, partial module tests and media rejection tests. Assert `validMediaKey('operations/cron/v1/editorial')===false`; actual public media GET/upload attempts for this namespace remain denied. Test no query errors become zeros or raw messages.
- [ ] **Commit** with message `Expose private maintenance status and complete email queue summaries`.

## Task 6: Visible, bounded polling and owner-only mobile panels

**Files:** Create `lib/client/visible-poller.ts`, `app/admin/OperationsStatusPanel.tsx`, `__tests__/visible-poller.test.ts`, `__tests__/operations-panel.test.ts`; modify `app/admin/EmailDeliveryPanel.tsx`, `app/admin/AdminApp.tsx` and existing admin CSS only for responsive placement.

**Interfaces:** Shared poller contract:

```ts
export interface VisiblePoller {
  refresh():Promise<void>;stop():void;
}
export function createVisiblePoller(options:{
  run:(signal:AbortSignal)=>Promise<void>;
  visibility:{isVisible:()=>boolean;subscribe:(listener:()=>void)=>()=>void};
  intervalMs?:number
}):VisiblePoller;
```

Production interval60000ms. It starts an immediate visible read, pauses hidden, refreshes on visible return, has at most one request, aborts on stop and suppresses aborted late results. Components use existing fetchWithTimeout with the supplied signal. A 401/403 clears private records/stats and stops automatic polling until a fresh authorized mount; manual refresh cannot resurrect stale data.

- [ ] **Write failing fake-timer tests:** immediate/60s reads; hidden for several intervals; visible resume; repeated manual refresh while in flight; stop abort; late resolution after stop; authorization loss clears state. Use injected visibility callbacks, not a new DOM/testing-library dependency.
- [ ] **Run RED:** poller/panel tests using the existing `auth-client-recovery.test.ts` hook-harness pattern where needed.
- [ ] **Implement poller lifecycle and both consumers.** In each run check signal.aborted before committing any state. De-duplicate manual refresh with the same in-flight promise. Store a stopped/authorization flag so a raced successful response cannot restore data after a denial.

```ts
const response=await fetchWithTimeout('/api/admin/operations-status',{
  cache:'no-store',signal
});
if(signal.aborted)return;
if(response.status===401||response.status===403){clearPrivateState();poller.stop();return;}
```

`clearPrivateState` is each component's local state-reset function; no shared customer store. For structured503 partial results show available entries plus unavailable notice, not an empty healthy panel. Do not convert raw unknown server errors into visible driver text.

For the new operations panel keep one nullable `OperationsStatus` snapshot, and reset it atomically on denial. The email panel must likewise clear its jobs, both queue summaries, configuration and in-flight error state; no previously fetched private rows remain visible.

- [ ] **Place OperationsStatusPanel only in the existing explicit super-admin fragment near SearchConsolePanel/PerformancePanel in AdminApp.** Crew dashboard access must not render/fetch it. Extend EmailDeliveryPanel with complete queue counts, oldest due time, legacy review note and existing bounded list. Keep staff UI English and existing retry/manual-review controls.
- [ ] **Preserve mobile usability:** existing card styles, stacking grid, zero-minimum children, wrapping diagnostic labels, semantic headings and 44px controls. No new design system, forced animation or whole-admin rewrite.
- [ ] **Run GREEN:** fake-timer/hook/SSR panel tests, `auth-client-recovery`, admin access tests and focused lint/typecheck. Positive role tests use module/browser fixtures only, never minted production sessions.
- [ ] **Commit** with message `Auto-refresh private maintenance panels while visible`.

## Task 7: Actual Worker, private UI fixtures and release acceptance

**Files:** Create `scripts/maintenance-worker-regression.mjs`, `scripts/maintenance-panel-regression.mjs`; extend existing `scripts/editorial-worker-regression.mjs` for protected operations keys/API; update API.md and release/checkpoint evidence. Change release markers only at the final release boundary.

**Interfaces:** Existing frozen-runtime tooling, new private monitor modules and owner-only UI. No real provider/database secrets are passed to local Worker fixtures.

- [ ] **Write/run a failing bundled-Worker regression before declaring integration complete.** Verify the built Worker denies public operations API/media, still protects editorial/catalogue manifests, retains old-product guards and does not issue a provider request when no configuration exists. For scheduling behavior, use the installed Miniflare/workerd scheduled dispatch API documented by its local package; do not invent a signature. If unavailable, use the actual createWorker scheduled handler with mocked bindings and separately test built endpoint privacy.
- [ ] **Set the release marker before final checks:** use `maintenance-monitoring-20261026-v1` consistently in `worker-runtime.mjs`, `public/release-client.js`, `public/sw.js`, `__tests__/browser-https-upgrade.test.ts` and `__tests__/edge-public-cache.test.ts`. If release is later, record the actual immutable marker consistently; never reuse a published marker.
- [ ] **Run integrated checks:** focused new suites, `npm test`, `npx tsc --noEmit`, `npm run lint`, explicit isolated PostgreSQL lease/aggregate/reservation suites, `npm run cf:build` and dry bundling from the source checkout with `--keep-vars`. Freeze bundle/assets outside the repo. Use fresh outputs; record skipped tests and existing warnings accurately.
- [ ] **Capture local phone/tablet/desktop owner and crew UI fixtures.** Test visible polling, tab hiding, partial failures, 401/403 cleanup, manual refresh and no overflow at390/768/1440. Fixtures stay loopback-only and intercept all mutations/provider calls. Server-protected positive pages require dependency-mocked local tests or legitimate local test sessions; browser interception alone is not server-authentication proof.
- [ ] **Review complete diff against this spec and actual starting commit.** Confirm that only diagnostics changed in financial helper/cron code; no paid-order replay, fair-selection change, stock mutation, historical resend, new alert recipient or permission expansion. Inspect untracked files too.
- [ ] **Commit evidence, create/attach the PR and use normal reviewed merge.** Preserve standing Cloudflare-only deployment policy, all binding name/type pairs, secret values and dashboard-managed cron. Do not bypass required checks or trigger a live test cron/payment/email to prove the release.
- [ ] **Observe natural scheduled execution and verify read-only.** Confirm release marker and public denials; inspect safe private operator records through legitimately configured operator access or owner-visible status, not a fabricated admin session. Wait for the existing next scheduled slot; verify stored outcomes are valid, not necessarily all green. Deliberately disabled social stays disabled. Missing providers/real backlog must be reported honestly, not enabled or sent merely for verification.
- [ ] **Write the handoff:** what passed, actual observed job states, queue limits, remaining finance-recovery/fairness issues and no inbox/zero-failure guarantee. Keep private operator files out of Git.

## Self-review and execution handoff

The owner reviews this plan alongside the native-interface plan and selects Native or Subagent-driven execution before product code. Both plans retain one active writer per shared worktree. This delivery proves observed maintenance outcomes and bounded receipt processing, not overall payment correctness or guaranteed customer inbox delivery.
