import { describe, expect, it } from 'vitest';
import { readJsonObject } from '@/lib/server/json-body';
const request = (body: string, headers: Record<string, string> = {}) => new Request('https://urbangangtour.co.ke/api/admin/login', { method: 'POST', headers, body });
describe('bounded credential JSON', () => {
  it('accepts an ordinary object', async () => expect(await readJsonObject(request('{"password":"fixture"}'))).toEqual({ ok: true, value: { password: 'fixture' } }));
  it.each(['null', '[]', 'true', '42', '"text"', '{', ''])('rejects malformed/non-object body %s', async body => expect(await readJsonObject(request(body))).toMatchObject({ ok: false, status: 400 }));
  it('enforces bytes without trusting a missing or false Content-Length', async () => {
    for (const headers of [{}, { 'content-length': '1' }]) expect(await readJsonObject(request('{"password":"' + 'é'.repeat(50) + '"}', headers), 100)).toMatchObject({ ok: false, status: 413 });
  });
  it('rejects oversized declared bodies before consuming the stream', async () => {
    const req = request('{}', { 'content-length': '999999999' });
    expect(await readJsonObject(req)).toMatchObject({ ok: false, status: 413 });
    expect(req.bodyUsed).toBe(false);
  });
  it.each(['-1', 'garbage', '1.5'])('rejects invalid declared length %s', async value => expect(await readJsonObject(request('{}', { 'content-length': value }))).toMatchObject({ ok: false, status: 400 }));
  it('bounds a stream with no end and cancels it', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    const req = new Request('https://urbangangtour.co.ke/api/admin/login', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' });
    expect(await readJsonObject(req, 8192, 10)).toEqual({ ok: false, status: 408, error: 'request_timeout' });
    expect(cancelled).toBe(true);
  });
});
