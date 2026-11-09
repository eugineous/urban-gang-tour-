import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {publicInstagramProjection} from '@/lib/instagram-public.mjs';
const state=vi.hoisted(()=>({archive:null as unknown,fetch:vi.fn()}));
vi.mock('@/lib/server/instagram-archive',()=>({readPublicInstagramArchive:async()=>state.archive,fetchGithubInstagramAsset:(...args:unknown[])=>state.fetch(...args)}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture'}));
import {GET,HEAD} from '@/app/instagram-media/[id]/route';
const hash='a'.repeat(64),id='ig-17800000000000001-'+hash.slice(0,16);
const asset={id,kind:'video',width:720,height:1280,bytes:100,sha256:hash,file:id+'.mp4',release:'instagram-media',duration:35};
const post={id:'17800000000000001',code:'PUBLIC123',caption:'Keep this\n#Original 🎤',permalink:'https://www.instagram.com/p/PUBLIC123/',timestamp:null,published:true,audience:'general',assets:[asset]};
const archive=()=>({version:1,account:'urban_newsgang',posts:[structuredClone(post)]});
const context=(value=id)=>({params:Promise.resolve({id:value})});
const request=(headers:Record<string,string>={})=>new Request('https://urbangangtour.co.ke/instagram-media/'+id,{headers});
beforeEach(()=>{state.archive=archive();state.fetch.mockReset()});afterEach(()=>vi.restoreAllMocks());
it('projects only approved general-audience records and strips arbitrary source/secret fields',()=>{
 const value=archive();Object.assign(value.posts[0],{internalToken:'never-public'});value.posts.push({...post,id:'17800000000000002',published:false,caption:'pending'});
 const projected=publicInstagramProjection(value)!;expect(projected.posts).toHaveLength(1);expect(projected.posts[0].caption).toBe('Keep this\n#Original 🎤');expect(JSON.stringify(projected)).not.toContain('never-public');expect(JSON.stringify(projected)).not.toContain('pending');
});
it('never fetches a draft, an invalid ID or an unlisted file',async()=>{
 const value=archive();value.posts[0].published=false;state.archive=value;
 expect((await GET(request(),context())).status).toBe(404);expect((await GET(request(),context('../private'))).status).toBe(404);expect(state.fetch).not.toHaveBeenCalled();
});
it('streams only the manifest-bound GitHub file and forwards a valid byte range',async()=>{
 state.fetch.mockResolvedValue(new Response(new Uint8Array(10),{status:206,headers:{'Content-Length':'10','Content-Range':'bytes 10-19/100'}}));
 const response=await GET(request({Range:'bytes=10-19'}),context());expect(response.status).toBe(206);expect(response.headers.get('Content-Range')).toBe('bytes 10-19/100');expect((await response.arrayBuffer()).byteLength).toBe(10);
 expect(state.fetch).toHaveBeenCalledWith('https://github.com/eugineous/urban-gang-tour-/releases/download/instagram-media/'+id+'.mp4',{method:'GET',range:'bytes=10-19'});
});
it('rejects multi-range and out-of-bounds requests without fetching media',async()=>{
 for(const range of ['bytes=0-1,4-5','bytes=100-200','bytes=30-20','bytes=-0'])expect((await GET(request({Range:range}),context())).status).toBe(416);expect(state.fetch).not.toHaveBeenCalled();
});
it('supports HEAD and conditional requests without returning video bytes',async()=>{
 state.fetch.mockResolvedValue(new Response(null,{headers:{'Content-Length':'100'}}));
 const head=await HEAD(request(),context());expect(head.status).toBe(200);expect(await head.text()).toBe('');expect(head.headers.get('Content-Length')).toBe('100');
 state.fetch.mockClear();expect((await GET(request({'If-None-Match':'"'+hash+'"'}),context())).status).toBe(304);expect(state.fetch).not.toHaveBeenCalled();
});
it('does not stream a response that disagrees with the archived file size',async()=>{
 state.fetch.mockResolvedValue(new Response(new Uint8Array(3),{headers:{'Content-Length':'3'}}));expect((await GET(request(),context())).status).toBe(502);
 state.fetch.mockResolvedValue(new Response(new Uint8Array(10),{status:206,headers:{'Content-Length':'10','Content-Range':'bytes 10-19/999'}}));expect((await GET(request({Range:'bytes=10-19'}),context())).status).toBe(502);
});
