// Production-compiled route smoke test. Deliberately restricted to localhost:
// no live provider credentials, customer mutations or marketing publication.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = new URL(process.argv[2] || 'http://127.0.0.1:4202');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Run only against an isolated local server.');
const inventory = JSON.parse(await readFile(new URL('../docs/backend-route-inventory-20261014.json', import.meta.url), 'utf8'));
const checks = [];
for (const route of inventory.routes.filter(route => route.route.startsWith('/api/admin/') && !['/api/admin/login', '/api/admin/google'].includes(route.route))) {
  for (const method of route.methods) {
    const pathname = route.route.replace(/\[[^\]]+\]/g, 'FIXTURE');
    const response = await fetch(new URL(pathname, base), {
      method,
      // Valid production Origin means the authorization guard, not a foreign
      // Origin rejection, must block these anonymous requests.
      headers: { origin: 'https://urbangangtour.co.ke', 'content-type': 'application/json' },
      ...(!['GET', 'HEAD'].includes(method) ? { body: '{}' } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    assert.ok([401, 403].includes(response.status), `${method} ${pathname}: expected access denial, got ${response.status}`);
    assert.match(response.headers.get('cache-control') || '', /no-store/, `${pathname}: private responses must not be stored`);
    assert.equal(response.headers.get('x-powered-by'), null);
    checks.push({ method, pathname, status: response.status });
  }
}
console.log(JSON.stringify({ localOnly: true, anonymousProtectedHandlerChecks: checks.length, checks }, null, 2));
