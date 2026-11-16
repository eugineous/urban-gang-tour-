import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.query}));
vi.mock('@/lib/server/microcache',()=>({cached:(_key:string,_ttl:number,work:()=>unknown)=>work()}));
vi.mock('@/lib/server/marketing-campaigns',()=>({publicCampaigns:async()=>({campaigns:[]})}));
import {uploadedMediaIsPublic} from '@/lib/server/upload-publication';
import {EMPTY_PARTNER} from '@/lib/partner-events';
const url='/media/admin-events/'+'a'.repeat(64)+'/poster.jpg';
beforeEach(()=>state.query.mockReset());
it('allows validated additional published partner posters as well as the primary image',async()=>{
 state.query.mockResolvedValue([{kind:'partner',image:'/other.jpg',logo:'',partner_details:{...EMPTY_PARTNER,organizer:'Real organizer',role:'Event hosts',admission:'free',posters:[{url,caption:'Owned event poster'}]}}]);
 expect(await uploadedMediaIsPublic('admin-events',url)).toBe(true);expect(state.query.mock.calls[0][0]).toContain('status=ANY');expect(state.query.mock.calls[0][1][1]).not.toContain('draft');
 state.query.mockResolvedValue([{kind:'ticketed',image:url,logo:'',partner_details:null}]);expect(await uploadedMediaIsPublic('admin-events',url)).toBe(true);
});
it('rejects missing, malformed or nonmatching partner attachments',async()=>{
 for(const rows of [[],[{kind:'partner',image:'/other.jpg',partner_details:{posters:[{url,caption:'Missing required metadata'}]}}],[{kind:'partner',image:'/other.jpg',partner_details:{...EMPTY_PARTNER,posters:[]}}]]){state.query.mockResolvedValue(rows);expect(await uploadedMediaIsPublic('admin-events',url)).toBe(false)}
});
