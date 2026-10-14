import {afterEach,describe,it,expect,vi} from 'vitest';
import {stkPushQuery} from '@/lib/server/mpesa';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
async function query(body:unknown){
  for(const key of ['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY'])vi.stubEnv(key,'test-only');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({access_token:'fixture'}))).mockResolvedValueOnce(new Response(JSON.stringify(body))));
  return stkPushQuery('ws_CO_fixture');
}
describe('authoritative M-Pesa query parsing',()=>{
  it.each([{}, {ResultCode:null}, {ResultCode:''}, {ResultCode:false}, {ResultCode:'not-a-result'}])('rejects absent or invalid provider outcome',async body=>expect(await query(body)).toMatchObject({ok:false,reason:'query_failed'}));
  it('accepts a provider-confirmed success',async()=>expect(await query({ResultCode:0,ResultDesc:'Processed successfully'})).toMatchObject({ok:true,resultCode:0}));
  it('keeps provider decline as a decline',async()=>expect(await query({ResultCode:1032,ResultDesc:'Cancelled'})).toMatchObject({ok:true,resultCode:1032}));
});
