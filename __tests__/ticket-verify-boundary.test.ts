import { beforeEach,describe, expect, it, vi } from 'vitest';

const q = vi.hoisted(() => vi.fn(async () => []));

vi.mock('@/lib/server/session', () => ({
  verifyAdminSession: vi.fn(async () => true),
  hasPerm: vi.fn(() => true),
  isAdmin: vi.fn(() => true),
  signedAdminSessionId: vi.fn(() => 'fixture-signed-session'),
  adminActor: vi.fn(() => 'fixture-admin'),
}));
vi.mock('@/lib/server/origin', () => ({ requireOrigin: vi.fn(() => true) }));
vi.mock('@/lib/server/ratelimit', () => ({ rateLimit: vi.fn(() => true), clientIp: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/server/db', () => ({ hasDb:()=>true,db: () => ({}), q }));
vi.mock('@/lib/server/tickets', () => ({
  codeAuthentic: vi.fn(() => false),
  getTicket: vi.fn(async () => null),
  getEventName: vi.fn(async () => ''),
  getEventMeta: vi.fn(async () => undefined),
  ensureTicketSchema:vi.fn(async()=>{}),
}));
vi.mock('@/lib/server/notify', () => ({ notifyTicketScan: vi.fn(async () => {}) }));

import { POST } from '@/app/api/tickets/verify/route';
import {codeAuthentic,getTicket} from '@/lib/server/tickets';
beforeEach(()=>{q.mockClear();vi.mocked(codeAuthentic).mockReturnValue(false);vi.mocked(getTicket).mockResolvedValue(null)});

describe('online ticket validation boundary', () => {
  it('rejects an oversized scan before decoding or touching tickets',async()=>{
    const response=await POST(new Request('http://localhost/api/tickets/verify',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify({code:'fixture',ignored:'x'.repeat(1500)})}));
    expect(response.status).toBe(413);expect(q).not.toHaveBeenCalled();
  });
  it('identifies a voided ticket before reporting a historical admission',async()=>{
    vi.mocked(codeAuthentic).mockReturnValue(true);vi.mocked(getTicket).mockResolvedValue({code:'TKT-FIXTURE',order_id:'ORD-FIXTURE',event_id:'event',tier_name:'General',holder:'Fixture group',position:1,of_count:1,used_at:'2027-01-20T07:00:00Z',used_by:'gate',created_at:'2027-01-19T07:00:00Z',voided_at:'2027-01-20T08:00:00Z',marketplace_event_id:null});
    const response=await POST(new Request('http://localhost/api/tickets/verify',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify({code:'TKT-FIXTURE'})}));
    expect(await response.json()).toMatchObject({result:'invalid',reason:'ticket_voided'});
  });
  it('rejects malformed QR data without attempting a ticket-consumption update', async () => {
    q.mockClear();
    const response = await POST(new Request('http://localhost/api/tickets/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ code: 'not-a-ticket' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: 'invalid', reason: 'bad_code' });
    expect(q.mock.calls.some(([sql]) => String(sql).includes('UPDATE tickets SET used_at'))).toBe(false);
  });
});
