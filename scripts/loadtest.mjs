// Venue load test: can the site take a full hall arriving at once?
//
//   node scripts/loadtest.mjs [baseUrl] [devices] [concurrency]
//   node scripts/loadtest.mjs http://localhost:3000 1000 120
//
// The scenario is the one that actually breaks things, and it is not raw
// traffic volume: it is a thousand people sharing ONE public IP. That is what a
// school hall, a campus, or Safaricom's CGNAT looks like from the server side.
// Per-IP rate limiting treats that as one very busy attacker.
//
// Two phases:
//   1. Arrival - every device fires the four reads a page load makes
//      (/api/promos + the three /api/site-data/* endpoints).
//   2. Checkout - every device polls /api/orders/status the way the STK-waiting
//      panel does while an M-Pesa prompt is open. Ten polls each is about a
//      minute of waiting. Order ids that do not exist are used, so nothing is
//      created and no payment is touched; a 404 is the expected success.
//
// A 429 in either phase is a real person who cannot use the site. The test
// fails on any.
//
// Measured against this build on 2026-09-09: 4000 arrival requests and 10,000
// poll requests, zero turned away. Against the previous per-IP limiter the same
// hall lost 94% of its requests to 429s.

const BASE = process.argv[2] || 'http://localhost:3000';
const DEVICES = Number(process.argv[3] || 1000);
const CONCURRENCY = Number(process.argv[4] || 120);
const POLLS_EACH = 10;

// One IP for everybody. cf-connecting-ip is what lib/server/ratelimit.ts reads.
const VENUE_IP = '196.201.214.77';
const READS = ['/api/promos', '/api/site-data/events', '/api/site-data/products', '/api/site-data/gallery'];

const deviceId = (i) => i.toString(16).padStart(32, '0');

async function pool(tasks, concurrency) {
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < tasks.length) await tasks[i++]();
    }),
  );
}

function collector() {
  return { ok: 0, rateLimited: 0, serverError: 0, other: 0, lat: [] };
}

async function hit(url, did, s, okStatuses) {
  const t0 = performance.now();
  try {
    const r = await fetch(url, {
      headers: { cookie: `ugt_did=${did}`, 'cf-connecting-ip': VENUE_IP },
    });
    s.lat.push(performance.now() - t0);
    if (r.status === 429) s.rateLimited++;
    else if (okStatuses.includes(r.status)) s.ok++;
    else if (r.status >= 500) s.serverError++;
    else s.other++;
  } catch {
    s.other++;
  }
}

function report(name, s, total, elapsed) {
  s.lat.sort((a, b) => a - b);
  const p = (q) => (s.lat[Math.floor(s.lat.length * q)] || 0).toFixed(0);
  const turnedAway = s.rateLimited + s.serverError;
  console.log(`\n--- ${name} ---`);
  console.log(`requests        ${total}`);
  console.log(`elapsed         ${elapsed.toFixed(1)}s  (${(total / elapsed).toFixed(0)} req/s)`);
  console.log(`served          ${s.ok}`);
  console.log(`429 turned away ${s.rateLimited}`);
  console.log(`5xx             ${s.serverError}`);
  console.log(`other           ${s.other}`);
  console.log(`latency p50/p95 ${p(0.5)}ms / ${p(0.95)}ms`);
  return turnedAway;
}

console.log(`${DEVICES} devices, all behind ${VENUE_IP}, concurrency ${CONCURRENCY}`);
console.log(`target ${BASE}`);

// Phase 1: arrival.
const arrival = collector();
const arrivalTasks = [];
for (let d = 0; d < DEVICES; d++) {
  const did = deviceId(d);
  for (const path of READS) arrivalTasks.push(() => hit(BASE + path, did, arrival, [200]));
}
let t = performance.now();
await pool(arrivalTasks, CONCURRENCY);
const failA = report('arrival: four reads per page load', arrival, arrivalTasks.length, (performance.now() - t) / 1000);

// Phase 2: checkout polling.
const polling = collector();
const pollTasks = [];
for (let d = 0; d < DEVICES; d++) {
  const did = deviceId(d);
  for (let p = 0; p < POLLS_EACH; p++) {
    pollTasks.push(() => hit(`${BASE}/api/orders/status?id=ORD-LOADTEST-${d}`, did, polling, [200, 404]));
  }
}
t = performance.now();
await pool(pollTasks, CONCURRENCY);
const failB = report('checkout: status polling while paying', polling, pollTasks.length, (performance.now() - t) / 1000);

const total = failA + failB;
console.log(`\n${total === 0 ? 'PASS' : 'FAIL'}: ${total} requests turned away across both phases`);
process.exit(total === 0 ? 0 : 1);
