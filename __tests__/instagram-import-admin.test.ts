import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const auth=vi.hoisted(()=>({session:true,gallery:true,owner:true}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>auth.session,hasPerm:()=>auth.gallery,isSuperAdmin:()=>auth.owner}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>true}));
import {GET,POST} from '@/app/api/admin/instagram-import/route';
beforeEach(()=>{auth.session=true;auth.gallery=true;auth.owner=true;vi.stubEnv('GITHUB_INSTAGRAM_TOKEN','');vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404}))) });
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
const request=(body:unknown)=>new Request('https://urbangangtour.co.ke/api/admin/instagram-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const input={profile:'https://www.instagram.com/urban_newsgang/',rightsConfirmed:true,publishGeneral:false};
it('keeps status private and rejects an unauthenticated importer',async()=>{
 auth.session=false;expect((await GET(new Request('https://urbangangtour.co.ke/api/admin/instagram-import'))).status).toBe(401);expect((await POST(request(input))).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
});
it('denies non-gallery staff and permits only the owner to start a workflow',async()=>{
 auth.gallery=false;expect((await POST(request(input))).status).toBe(403);auth.gallery=true;auth.owner=false;expect((await POST(request(input))).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it('reports the native GitHub fallback rather than claiming an unconfigured workflow started',async()=>{
 const response=await POST(request(input));expect(response.status).toBe(503);expect((await response.json()).error).toBe('github_dispatch_not_configured');expect(fetch).not.toHaveBeenCalled();
});
it('rejects another Instagram account and unconfirmed republication before GitHub work',async()=>{
 vi.stubEnv('GITHUB_INSTAGRAM_TOKEN','fixture-github-token');
 expect((await POST(request({...input,profile:'https://www.instagram.com/other/'}))).status).toBe(400);
 expect((await POST(request({...input,rightsConfirmed:false}))).status).toBe(400);
 expect((await POST(request({...input,extra:'x'}))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
});
it('queues only the fixed repository workflow and never claims the import finished',async()=>{
 vi.stubEnv('GITHUB_INSTAGRAM_TOKEN','fixture-github-token');vi.mocked(fetch).mockResolvedValue(new Response(null,{status:204}));
 const response=await POST(request(input)),data=await response.json();expect(response.status).toBe(202);expect(data.state).toBe('queued');expect(data).not.toHaveProperty('imported');
 const [url,options]=vi.mocked(fetch).mock.calls[0];expect(url).toBe('https://api.github.com/repos/eugineous/urban-gang-tour-/actions/workflows/instagram-import.yml/dispatches');
 expect(JSON.parse(String(options?.body))).toEqual({ref:'main',inputs:{profile:input.profile,confirm_rights:'true',publish_general:'false',auto_sync:'true'}});
 expect(JSON.stringify(data)).not.toContain('fixture-github-token');
});
it('does not claim queue acceptance when GitHub rejects the dispatch',async()=>{
 vi.stubEnv('GITHUB_INSTAGRAM_TOKEN','fixture-github-token');vi.mocked(fetch).mockResolvedValue(new Response('provider details',{status:403}));
 const response=await POST(request(input));expect(response.status).toBe(502);expect((await response.json()).error).toBe('github_workflow_unavailable');
});
