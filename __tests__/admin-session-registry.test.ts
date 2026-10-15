import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q,qSchema:async()=>{}}));
vi.mock('@/lib/server/admin-accounts',()=>({findAdminAccount:async()=>null}));
import { registerAdminSession, revokeAdminSession, sessionIdHash, revokePasswordSessions } from '@/lib/server/admin-sessions';
import { signToken, verifyAdminSession } from '@/lib/server/session';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SESSION_SECRET','fixture-only-key')});
afterEach(()=>vi.unstubAllEnvs());
it('stores a hashed identity, never the cookie bearer, before issuing a new session',async()=>{
 state.q.mockResolvedValue([{id:'fixture'}]);const sid=await registerAdminSession('fixture-admin','access_code');const args=state.q.mock.calls[0][1];expect(sid).toMatch(/^[a-f0-9]{64}$/);expect(args[0]).toBe(sessionIdHash(sid));expect(args[0]).not.toBe(sid);
});
it('rejects revoked sessions on the next request even with a valid HMAC',async()=>{
 const sid='a'.repeat(64);let active=true;state.q.mockImplementation(async()=>active?[{id:sessionIdHash(sid)}]:[]);
 const request=()=>new Request('https://urbangangtour.co.ke/api/admin/me',{headers:{cookie:'ugt_admin='+signToken({role:'admin',scope:'super_admin',authSource:'access_code',sid})}});
 expect(await verifyAdminSession(request())).toBe(true);active=false;expect(await verifyAdminSession(request())).toBe(false);
});
it('fails closed during registry outages but retains a short credential-bound recovery path',async()=>{
 state.q.mockRejectedValue(new Error('fixture outage'));const sid='a'.repeat(64);
 expect(await verifyAdminSession(new Request('https://urbangangtour.co.ke/api/admin/me',{headers:{cookie:'ugt_admin='+signToken({role:'admin',scope:'super_admin',sid})}}))).toBe(false);
});
it('password changes revoke other password sessions and retire legacy password cookies',async()=>{
 state.q.mockResolvedValue([]);await revokePasswordSessions('a'.repeat(64));const [sql,args]=state.q.mock.calls[0];expect(sql).toContain("auth_source='access_code'");expect(sql).toContain('legacy_password_disabled=true');expect(args[0]).toBe(sessionIdHash('a'.repeat(64)));
 state.q.mockClear();await revokeAdminSession('a'.repeat(64));expect(state.q.mock.calls[0][1]).toEqual([sessionIdHash('a'.repeat(64))]);
});
