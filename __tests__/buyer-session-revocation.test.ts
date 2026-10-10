import {it,expect,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({token:null as any,q:vi.fn()}));
vi.mock('@/lib/server/session',()=>({currentUser:()=>state.token}));
vi.mock('@/lib/server/db',()=>({q:state.q,hasDb:()=>true}));
import {validatedCurrentBuyer} from '@/lib/server/customer-account';
beforeEach(()=>{state.token=null;state.q.mockReset()});
it('accepts a legacy buyer cookie only before the first password reset',async()=>{
  state.token={id:3};let version=0;
  state.q.mockImplementation(async(sql:string)=>sql.startsWith('SELECT')?[{id:3,email:'owner@example.com',phone:'0712345678',name:'Owner',session_version:version}]:[]);
  expect(await validatedCurrentBuyer(new Request('https://urbangangtour.co.ke'))).toMatchObject({id:3,phone:'0712345678'});
  version=1;expect(await validatedCurrentBuyer(new Request('https://urbangangtour.co.ke'))).toBeNull();
  expect(state.q.mock.calls.filter(([sql])=>sql.startsWith('SELECT'))).toHaveLength(2);
});
it('rejects a previously valid version after reset on another device',async()=>{state.token={id:3,sessionVersion:2};state.q.mockResolvedValue([{id:3,session_version:3}]);expect(await validatedCurrentBuyer(new Request('https://urbangangtour.co.ke'))).toBeNull();});
it('rejects deleted accounts',async()=>{state.token={id:3,sessionVersion:2};state.q.mockResolvedValue([]);expect(await validatedCurrentBuyer(new Request('https://urbangangtour.co.ke'))).toBeNull();});
it('rejects malformed account IDs before any database work',async()=>{state.token={id:-1,sessionVersion:0};expect(await validatedCurrentBuyer(new Request('https://urbangangtour.co.ke'))).toBeNull();expect(state.q).not.toHaveBeenCalled()});
