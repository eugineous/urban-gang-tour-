import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireOrigin, sameOrigin } from '@/lib/server/origin';
const req = (origin?: string, headers: Record<string, string> = {}) => new Request('https://urbangangtour.co.ke/api/admin/example', { headers: { ...headers, ...(origin ? { origin } : {}) } });
beforeEach(() => { vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SITE_URL', 'https://preview.example.test'); });
afterEach(() => vi.unstubAllEnvs());
describe('explicit application origins', () => {
  it.each(['https://urbangangtour.co.ke', 'https://www.urbangangtour.co.ke', 'https://preview.example.test'])('accepts configured origin %s', origin => expect(requireOrigin(req(origin))).toBe(true));
  it.each(['http://urbangangtour.co.ke', 'https://urbangangtour.co.ke:444', 'http://localhost:3000', 'http://127.0.0.1:3000', 'null', 'https://evil.example.test', 'https://urbangangtour.co.ke/path', 'https://user@urbangangtour.co.ke'])('rejects untrusted or malformed production origin %s', origin => expect(requireOrigin(req(origin))).toBe(false));
  it('does not derive authority from forwarded host headers', () => {
    expect(requireOrigin(req('https://evil.example.test', { host: 'evil.example.test', 'x-forwarded-host': 'evil.example.test' }))).toBe(false);
  });
  it('requires Origin for privileged mutations but retains absent-Origin public clients', () => {
    expect(requireOrigin(req())).toBe(false);
    expect(sameOrigin(req())).toBe(true);
  });
  it('allows localhost only outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(requireOrigin(req('http://localhost:4201'))).toBe(true);
    expect(requireOrigin(req('http://127.0.0.1:4201'))).toBe(true);
  });
  it('does not accept an insecure configured preview in production', () => {
    vi.stubEnv('SITE_URL', 'http://preview.example.test');
    expect(requireOrigin(req('http://preview.example.test'))).toBe(false);
  });
});
