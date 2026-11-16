import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({put:vi.fn(),allowed:true}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>true,hasPerm:()=>true}));
vi.mock('@/lib/server/media',()=>({mediaConfigured:()=>true,mediaPut:state.put}));
vi.mock('@/lib/server/ratelimit',()=>({clientIp:()=> 'fixture',rateLimit:()=>state.allowed}));
vi.mock('@/lib/server/organizer-session',()=>({currentApprovedOrganizer:async()=>({organizer:{id:'fixture-owner'}})}));
import {POST as gallery} from '@/app/api/admin/gallery/upload/route';
import {POST as hero} from '@/app/api/admin/docs/hero-upload/route';
import {POST as organizer} from '@/app/api/organizer/events/upload-image/route';
const origin='https://urbangangtour.co.ke';
beforeEach(()=>{state.allowed=true;state.put.mockReset().mockResolvedValue({url:'/media/gallery/saved.png'})});
it.each([['gallery',gallery,'/api/admin/gallery/upload?pathname=gallery/file.png'],['hero',hero,'/api/admin/docs/hero-upload?pathname=promo-hero/file.png'],['organizer',organizer,'/api/organizer/events/upload-image']] as const)('%s rejects declared oversized bodies without reading them',async(_name,handler,path)=>{
 let pulls=0;const req=new Request(origin+path,{method:'POST',headers:{origin,'content-type':'image/png','content-length':'999999999'},body:new ReadableStream({pull(){pulls++}},{highWaterMark:0}),duplex:'half'} as RequestInit);
 expect((await handler(req)).status).toBe(413);expect(pulls).toBe(0);expect(state.put).not.toHaveBeenCalled();
});
it('rejects a document hero claiming PNG with executable text bytes',async()=>{
 const r=await hero(new Request(origin+'/api/admin/docs/hero-upload?pathname=promo-hero/file.png',{method:'POST',headers:{origin,'content-type':'image/png'},body:'<script>alert(1)</script>'}));expect(r.status).toBe(400);expect(state.put).not.toHaveBeenCalled();
});
it('requires trusted Origin on organizer upload before reading or storing',async()=>{
 const r=await organizer(new Request(origin+'/api/organizer/events/upload-image',{method:'POST',headers:{'content-type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10])}));expect(r.status).toBe(403);expect(state.put).not.toHaveBeenCalled();
});
it('rate limits gallery uploads before reading the file',async()=>{state.allowed=false;expect((await gallery(new Request(origin+'/api/admin/gallery/upload?pathname=gallery/file.png',{method:'POST',headers:{origin,'content-type':'image/png'},body:new Uint8Array([137,80,78,71,13,10,26,10])}))).status).toBe(429);expect(state.put).not.toHaveBeenCalled()});
