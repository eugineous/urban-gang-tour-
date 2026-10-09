import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({clientIp:()=> 'test',rateLimit:()=>true}));
vi.mock('@/lib/server/google-identity',()=>({verifyGoogleIdentity:vi.fn()}));
vi.mock('@/lib/server/session',()=>({sessionSecretConfigured:()=>true,signToken:()=> 'signed-user',sessionCookie:()=> 'ugt_user=signed; HttpOnly; Secure'}));
vi.mock('@/lib/server/organizer-session',()=>({signOrganizerToken:()=> 'signed-organizer',organizerSessionCookie:()=> 'ugt_organizer=signed; HttpOnly; Secure'}));
import {q} from '@/lib/server/db';
import {verifyGoogleIdentity} from '@/lib/server/google-identity';
import {POST as buyer} from '@/app/api/auth/google/route';
import {POST as organizer} from '@/app/api/organizer/google/route';
const request=(body:any,origin='https://urbangangtour.co.ke')=>new Request('https://urbangangtour.co.ke/api/auth/google',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
describe('Google login authorization',()=>{
 beforeEach(()=>{vi.clearAllMocks();process.env.GOOGLE_OAUTH_CLIENT_ID='client';vi.mocked(verifyGoogleIdentity).mockResolvedValue('buyer@gmail.com')});
 it('rejects foreign origins and field tampering',async()=>{expect((await buyer(request({credential:'x'.repeat(30)},'https://evil.test'))).status).toBe(403);expect((await buyer(request({credential:'x'.repeat(30),role:'admin'}))).status).toBe(400);expect(q).not.toHaveBeenCalled()});
 it('does not create accounts on Google sign-in',async()=>{vi.mocked(q).mockResolvedValue([]);expect((await buyer(request({credential:'x'.repeat(30)}))).status).toBe(401);expect(vi.mocked(q).mock.calls[0][0]).toMatch(/^SELECT/)});
 it('never grants pending organizers a session',async()=>{vi.mocked(q).mockResolvedValue([{id:'1',status:'pending'}]);const r=await organizer(request({credential:'x'.repeat(30)}));expect(r.status).toBe(403);expect(r.headers.get('set-cookie')).toBeNull()});
 it('issues separate user and approved organizer cookies',async()=>{vi.mocked(q).mockResolvedValue([{id:'1',email:'buyer@gmail.com',status:'approved'}]);expect((await buyer(request({credential:'x'.repeat(30)}))).headers.get('set-cookie')).toContain('ugt_user');expect((await organizer(request({credential:'x'.repeat(30)}))).headers.get('set-cookie')).toContain('ugt_organizer')});
});
