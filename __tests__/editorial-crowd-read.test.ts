import {expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>false}));
vi.mock('@/app/_lib/blog',()=>({getBlogPosts:async()=>[]}));
import {GET} from '@/app/api/site-data/posts/route';
it('does not reject a venue of first-time article readers sharing one network',async()=>{
 const req=()=>new Request('https://urbangangtour.co.ke/api/site-data/posts',{headers:{'cf-connecting-ip':'192.0.2.140'}});
 for(let i=0;i<1000;i++)expect((await GET(req())).status).toBe(200);
});
it('retains the individual budget once a device cookie exists',async()=>{
 const req=()=>new Request('https://urbangangtour.co.ke/api/site-data/posts',{headers:{'cf-connecting-ip':'192.0.2.141',cookie:'ugt_did=fictional_reader_device'}});
 for(let i=0;i<60;i++)expect((await GET(req())).status).toBe(200);
 expect((await GET(req())).status).toBe(429);
});
