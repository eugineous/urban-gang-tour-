import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCampaign, campaignIsLive, campaignTargets, fromNairobiInput, safeCampaignImage, safeCampaignLink, type CampaignInput } from '@/lib/marketing-campaigns';
const state=vi.hoisted(()=>({q:vi.fn(),cached:vi.fn((_key:string,_ttl:number,fn:()=>Promise<unknown>)=>fn()),invalidate:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:state.q,qSchema:async()=>{}}));
vi.mock('@/lib/server/microcache',()=>({cached:state.cached,invalidate:state.invalidate}));
import { publicCampaigns, saveCampaign } from '@/lib/server/marketing-campaigns';
const valid:CampaignInput={name:'Fixture',headline:'Tour drop',description:'Official merchandise.',format:'popup',kind:'announcement',status:'live',image:'/assets/ugt-logo.png',href:'/shop',ctaLabel:'Shop',startsAt:null,endsAt:null,targets:['*'],priority:10,cooldownHours:24,delaySeconds:5,promoId:null};
const row={id:'CAM-FIXTURE-01',version:1,name:valid.name,headline:valid.headline,description:valid.description,format:valid.format,kind:valid.kind,status:valid.status,image:valid.image,href:valid.href,cta_label:valid.ctaLabel,starts_at:null,ends_at:null,targets:valid.targets,priority:10,cooldown_hours:24,delay_seconds:5,promo_id:null};
beforeEach(()=>{vi.clearAllMocks();state.q.mockReset();state.cached.mockImplementation((_k,_t,fn)=>fn());});
afterEach(()=>vi.restoreAllMocks());
describe('campaign publication contracts',()=>{
  it('accepts intentional short copy, safe links and owned art',()=>{expect(parseCampaign(valid)).toEqual(valid);expect(safeCampaignLink('/shop?color=pink')).toBe(true);expect(safeCampaignImage('https://urbangangtour.co.ke/assets/ugt-logo.png')).toBe(true)});
  it.each([{href:'javascript:alert(1)'},{href:'//evil.test'},{href:'/\\evil.test'},{image:'https://tracker.example.test/pixel.png'},{image:'data:image/svg+xml,<script/>'},{status:'unexpected'},{price:1},{delaySeconds:0},{cooldownHours:0},{targets:[]},{kind:'deal',promoId:null}])('rejects unsafe/incomplete campaign input %s',patch=>expect(parseCampaign({...valid,...patch})).toBeNull());
  it('uses Nairobi time and rejects invalid rolled-over calendar dates',()=>{expect(fromNairobiInput('2026-10-14T23:30')).toBe('2026-10-14T20:30:00.000Z');expect(()=>fromNairobiInput('2026-02-31T23:30')).toThrow();expect(parseCampaign({...valid,startsAt:'2026-02-31T20:30:00.000Z'})).toBeNull()});
  it('enforces schedules and avoids all sensitive/payment/video pages',()=>{
    for(const path of ['/checkout','/pay/success','/cart','/book','/account','/admin','/reels','/privacy-policy','/orders/track'])expect(campaignTargets({targets:['*']},path)).toBe(false);
    expect(campaignTargets({targets:['/shop']},'/shop')).toBe(true);
    expect(campaignIsLive({...valid,status:'paused'})).toBe(false);
    expect(campaignIsLive({...valid,status:'scheduled',startsAt:'2026-11-01T00:00:00.000Z'},Date.parse('2026-10-14T00:00:00.000Z'))).toBe(false);
  });
  it('publishes only safe public fields and requires actual live promo truth for deals',async()=>{
    state.q.mockResolvedValue([row]);const result=await publicCampaigns();
    expect(result.campaigns).toHaveLength(1);expect(result.campaigns[0]).not.toHaveProperty('name');expect(result.campaigns[0]).not.toHaveProperty('promoId');
    const sql=state.q.mock.calls[0][0];expect(sql).toContain("c.status IN ('live','scheduled')");expect(sql).toContain("AT TIME ZONE 'Africa/Nairobi'");expect(sql).toContain('p.uses<p.max_uses');
  });
  it('does not renew an expired cached campaign lease after a database outage',async()=>{
    state.cached.mockResolvedValue({campaigns:[row],expires:Date.now()-1});
    expect(await publicCampaigns()).toMatchObject({campaigns:[],validForMs:0});
  });
  it('atomically audits updates with optimistic versions and invalidates the public snapshot',async()=>{
    state.q.mockResolvedValue([{...row,version:2}]);await saveCampaign({...valid,id:row.id,version:1},'fixture-admin');
    const [sql,args]=state.q.mock.calls[0];expect(sql).toContain('AND version=$18');expect(sql).toContain('audit_log');expect(args[17]).toBe(1);expect(state.invalidate).toHaveBeenCalledWith('public-campaigns');
  });
  it('rejects concurrent overwrites or missing live checkout promotions',async()=>{
    state.q.mockResolvedValue([]);await expect(saveCampaign({...valid,id:row.id,version:1},'fixture')).rejects.toThrow('campaign_conflict');
    state.q.mockClear();await expect(saveCampaign({...valid,kind:'deal',promoId:1},'fixture')).rejects.toThrow('deal_promo_unavailable');expect(state.q).toHaveBeenCalledTimes(1);
  });
});
