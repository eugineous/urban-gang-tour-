import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const transport=vi.hoisted(()=>vi.fn());
beforeEach(()=>{vi.stubGlobal('fetch',transport);transport.mockReset()});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
async function api(){const path='../lib/client/gate-verification';const value=await import(path).catch(()=>null);expect(value,'gate requests must distinguish unverified transport from ticket rejection').not.toBeNull();return value!}
const ticket={event:'School show',eventDate:'2027-01-20 10:00',tier:'General',holder:'Fixture group',position:1,ofCount:2};
it('does not turn a lost network response into an invalid ticket',async()=>{transport.mockRejectedValue(new TypeError('connection lost'));expect(await(await api()).verifyGateTicket('TKT-FIXTURE')).toMatchObject({result:'unverified',reason:'network'})});
it.each([429,500,503])('keeps HTTP %s failures unverified even when a body claims validity',async status=>{transport.mockResolvedValue(Response.json({result:'valid',ticket,usedAt:'2027-01-20T07:00:00Z'},{status}));expect(await(await api()).verifyGateTicket('TKT-FIXTURE')).toMatchObject({result:'unverified'})});
it('requires a complete authoritative admission result before allowing a green verdict',async()=>{
 for(const body of [{result:'valid'},{result:'valid',ticket,usedAt:'invalid'},{result:'valid',ticket:{...ticket,position:3},usedAt:'2027-01-20T07:00:00Z'}]){transport.mockResolvedValueOnce(Response.json(body));expect(await(await api()).verifyGateTicket('TKT-FIXTURE')).toMatchObject({result:'unverified'})}
 transport.mockResolvedValueOnce(Response.json({result:'valid',ticket,usedAt:'2027-01-20T07:00:00Z'}));expect(await(await api()).verifyGateTicket('TKT-FIXTURE')).toMatchObject({result:'valid',ticket,usedAt:'2027-01-20T07:00:00Z'});
});
it('preserves authoritative used/invalid results and treats expired access separately',async()=>{
 const cases=[{body:{result:'invalid',reason:'bad_code'},status:200,result:'invalid'},{body:{result:'used',ticket,usedAt:'2027-01-20T07:00:00Z'},status:200,result:'used'},{body:{error:'unauthorized'},status:401,result:'signed_out'},{body:{error:'forbidden'},status:403,result:'forbidden'}];
 for(const test of cases){transport.mockResolvedValueOnce(Response.json(test.body,{status:test.status}));expect(await(await api()).verifyGateTicket('TKT-FIXTURE')).toMatchObject({result:test.result})}
});
it('bounds stalled response bodies, aborts the request and returns an unverified timeout',async()=>{
 const gate=await api();vi.useFakeTimers();transport.mockResolvedValue(new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}}));const pending=gate.verifyGateTicket('TKT-FIXTURE');await vi.advanceTimersByTimeAsync(12001);expect(await pending).toMatchObject({result:'unverified',reason:'timeout'});expect(transport.mock.calls[0][1].signal.aborted).toBe(true);
});
it('reports the deadline consistently when fetch rejects synchronously on abort',async()=>{
 const gate=await api();vi.useFakeTimers();transport.mockImplementation((_path,init)=>new Promise((_resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))}));
 const pending=gate.verifyGateTicket('TKT-FIXTURE');await vi.advanceTimersByTimeAsync(12001);expect(await pending).toMatchObject({result:'unverified',reason:'timeout'});
});
it('does not mislabel an unavailable access probe as a signed-out member',async()=>{
 transport.mockRejectedValueOnce(new TypeError('offline'));expect(await(await api()).getGateAccess()).toMatchObject({result:'unverified'});
 transport.mockResolvedValueOnce(Response.json({ok:true,scope:'crew_admin',perms:['gallery']}));expect(await(await api()).getGateAccess()).toMatchObject({result:'forbidden'});
 transport.mockResolvedValueOnce(Response.json({ok:true,scope:'crew_admin',perms:['gate_scanner']}));expect(await(await api()).getGateAccess()).toMatchObject({result:'allowed'});
});
