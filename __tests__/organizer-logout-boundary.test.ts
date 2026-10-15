import { expect, it, vi } from 'vitest';
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: () => true, clientIp: () => 'fixture' }));
import { POST, DELETE } from '@/app/api/organizer/logout/route';
it.each([POST, DELETE])('requires a trusted origin before clearing the organizer cookie', async handler => {
  for (const origin of [undefined, 'https://evil.example.test']) {
    const response = await handler(new Request('https://urbangangtour.co.ke/api/organizer/logout', { method: 'POST', headers: origin ? { origin } : {} }));
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  }
  const response = await handler(new Request('https://urbangangtour.co.ke/api/organizer/logout', { method: 'POST', headers: { origin: 'https://urbangangtour.co.ke' } }));
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  expect(response.headers.get('cache-control')).toContain('no-store');
});
