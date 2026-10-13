import {beforeEach,it,expect,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:vi.fn(),q:vi.fn()}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:vi.fn(async()=>{})}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'test',PUBLIC_READ_NETWORK_LIMIT:1000}));
vi.mock('@/lib/server/microcache',()=>({cached:(_key:string,_ttl:number,load:()=>unknown)=>load()}));
import {hasDb,q} from '@/lib/server/db';
import {ensureOpsSchema} from '@/lib/server/ops';
import {GET} from '@/app/api/site-data/products/route';
beforeEach(()=>{vi.resetAllMocks();vi.mocked(hasDb).mockReturnValue(true);vi.mocked(q).mockResolvedValue([])});
it('reports a genuine empty catalog as an empty result',async()=>{const r=await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));expect(r.status).toBe(200);expect(await r.json()).toEqual({ok:true,products:[]})});
it('does not disguise missing database configuration as no products',async()=>{vi.mocked(hasDb).mockReturnValue(false);const r=await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));expect(r.status).toBe(503);expect(await r.json()).toEqual({error:'catalog_unavailable'});expect(r.headers.get('cache-control')).toBe('no-store')});
it('does not disguise a transient read failure as an empty shop',async()=>{vi.mocked(q).mockRejectedValue(Error('Database password is private'));const r=await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));expect(r.status).toBe(503);expect(await r.json()).toEqual({error:'catalog_unavailable'})});
it('publishes personalization only for an explicit product opt-in',async()=>{
 vi.mocked(q).mockResolvedValue([{id:'rails',name:'Rails Tee',price:1500,name_on_back_enabled:true},{id:'generic',name:'Name Print Tee',price:900}]);
 const body=await (await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'))).json();
 expect(body.products.map((product:any)=>[product.id,product.name_on_back_enabled])).toEqual([['rails',true],['generic',false]]);
});
it('reads an existing catalogue without executing unrelated admin migrations',async()=>{
 await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));
 expect(ensureOpsSchema).not.toHaveBeenCalled();expect(q).toHaveBeenCalledOnce();
});
it.each(['42P01','42703'])('initialises and retries a missing catalogue schema (%s) once',async(code)=>{
 vi.mocked(q).mockRejectedValueOnce(Object.assign(new Error('private details'),{code})).mockResolvedValueOnce([]);
 const r=await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));
 expect(r.status).toBe(200);expect(ensureOpsSchema).toHaveBeenCalledOnce();expect(q).toHaveBeenCalledTimes(2);
});
it('does not run migrations on connection failures and logs no sensitive driver message',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{
  vi.mocked(q).mockRejectedValue(Object.assign(new Error('password=private'),{code:'08006'}));
  expect((await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'))).status).toBe(503);
  expect(ensureOpsSchema).not.toHaveBeenCalled();expect(log).toHaveBeenCalledWith('public_catalog_read_failed',{code:'08006'});
 }finally{log.mockRestore()}
});
it('does not log malformed SQLSTATE values',async()=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 try{
  vi.mocked(q).mockRejectedValue({code:'password=private'});
  await GET(new Request('https://urbangangtour.co.ke/api/site-data/products'));
  expect(log).toHaveBeenCalledWith('public_catalog_read_failed',{code:'unclassified'});
 }finally{log.mockRestore()}
});
