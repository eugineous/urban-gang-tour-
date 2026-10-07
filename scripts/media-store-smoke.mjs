import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Uses an existing public favicon, never customer data. The temporary KV
// fixture expires automatically and is deleted in finally. No R2 operations.
const remote = process.argv.includes('--remote');
const base = process.env.BASE || 'http://localhost:8787';
const fixture = 'public/icon-48.png';
const bytes = readFileSync(fixture);
const hash = createHash('sha256').update(bytes).digest('hex');
const key = `promo-hero/${hash}/storage-smoke.png`;
const storage = ['--binding', 'UGT_MEDIA', remote ? '--remote' : '--local'];
function cli(args) {
  execFileSync('npx', ['wrangler', 'kv', 'key', ...args, ...storage], { stdio: 'pipe' });
}
cli(['put', key, '--path', fixture, '--ttl', '120', '--metadata', JSON.stringify({ contentType: 'image/png', size: bytes.length })]);
try {
  const response = await fetch(`${base}/media/${key}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('etag'), `"${hash}"`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal((await fetch(`${base}/media/${key}`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${base}/media/${key}`, { headers: { 'if-none-match': `"${hash}"` } })).status, 304);
  assert.equal((await fetch(`${base}/media/documents/${hash}/storage-smoke.pdf`)).status, 401);
  console.log(`PASS ${remote ? 'production' : 'local Worker'} KV media bytes, MIME, HEAD, ETag and private-document gate`);
} finally {
  cli(['delete', key]);
}
