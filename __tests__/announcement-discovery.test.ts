import {beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({rows:[] as Record<string,unknown>[],q:vi.fn(),configured:true,truths:vi.fn(),admin:true,perm:true,origin:true}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.configured,q:state.q}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:async()=>{},opsAudit:vi.fn()}));
vi.mock('@/lib/server/session',()=>({verifyAdminSession:async()=>state.admin,isAdmin:()=>state.admin,isSuperAdmin:()=>true,hasPerm:()=>state.perm,adminActor:()=> 'fixture-editor'}));
vi.mock('@/lib/server/origin',()=>({requireOrigin:()=>state.origin}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:vi.fn()}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:()=>true,clientIp:()=> 'fixture',PUBLIC_READ_NETWORK_LIMIT:60000}));
vi.mock('@/lib/server/event-truth',()=>({resolveManyEventTruths:state.truths,resolveEventTruth:async()=>null}));
vi.mock('@/app/_lib/blog',()=>({getBlogPost:async()=>null,getBlogPosts:async()=>[]}));
vi.mock('next/server',async()=>({...await vi.importActual<typeof import('next/server')>('next/server'),after:()=>{}}));
vi.mock('next/navigation',()=>({usePathname:()=>'/events/fixture',notFound:()=>{throw Error('not_found')},permanentRedirect:(url:string)=>{throw Error('redirect:'+url)}}));
import {readPublicEvents} from '@/lib/server/public-events';
import {GET} from '@/app/api/site-data/events/route';
import {POST} from '@/app/api/admin/ops/route';
import EventPage,{generateMetadata} from '@/app/events/[slug]/page';
import Portfolio from '@/app/_components/PartnerEventPortfolio';
import PartnerDetails,{type PartnerEventRecord} from '@/app/_components/PartnerEventDetails';
import TourStops from '@/app/tour-stops/page';
import {invalidate} from '@/lib/server/microcache';
import {isEventSellable,PUBLIC_EVENT_STATUSES} from '@/lib/server/event-lifecycle';
import {ownedEventPresentation,publicOwnedEvents} from '@/ui/lib/owned-event-presentation';

const announcement=(kind='partner')=>({id:'fixture-'+kind,slug:'fixture-'+kind,kind,name:'An honest announcement',status:'announced',event_date:null,event_time:'',venue:'',city:'',image:'',description:'',tiers:[],partner_details:null,updated_at:'2026-10-16 10:00:00.123456+00',private_email:'private@example.invalid'});
const save=(data:Record<string,unknown>)=>POST(new Request('https://urbangangtour.co.ke/api/admin/ops',{method:'POST',headers:{origin:'https://urbangangtour.co.ke','content-type':'application/json'},body:JSON.stringify({kind:'tourEvent.save',data})}));
beforeEach(()=>{
 state.rows=[announcement()];state.configured=true;state.admin=true;state.perm=true;state.origin=true;state.q.mockReset();state.truths.mockReset().mockResolvedValue([]);
 for(const kind of ['all','school','past','partner','ticketed'])invalidate('site-events:'+kind);
 state.q.mockImplementation(async(sql:string,args:unknown[]=[])=>{
  if(sql.startsWith('INSERT INTO tour_events'))return [{...announcement(String(args[0])),status:args[9],name:args[1]}];
  if(sql.includes('FROM tour_events'))return /WHERE (slug|id)=\$1/.test(sql)?state.rows.filter(row=>(sql.includes('WHERE slug=$1')?row.slug:row.id)===args[0]&&PUBLIC_EVENT_STATUSES.includes(row.status as never)):state.rows;
  return [];
 });
});
it('shares a public-only whitelisted snapshot without inventing absent details',async()=>{
 state.rows.push({...announcement(),id:'hidden',status:'draft'});
 const rows=await readPublicEvents();expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({status:'announced',eventDate:null,image:'',venue:'',sellable:false,partnerDetails:{organizer:'',client:'',role:'',admission:'unconfirmed'}});
 expect(JSON.stringify(rows)).not.toContain('private@example.invalid');expect(JSON.stringify(rows)).not.toContain('hidden');
 const response=await GET(new Request('https://urbangangtour.co.ke/api/site-data/events'));expect(response.headers.get('cache-control')).toBe('no-store');expect((await response.json()).events).toEqual(JSON.parse(JSON.stringify(rows)));expect(state.q).toHaveBeenCalledTimes(1);
});
it('does not turn announced or non-ticketed records into purchase inventory',async()=>{
 for(const kind of ['ticketed','partner','school','past']){
  expect(isEventSellable({kind,status:'announced',tiers:[{price:1}]})).toBe(false);
  expect(ownedEventPresentation({...announcement(kind),eventDate:null,sellable:true},Date.now()).sellable).toBe(false);
 }
 state.rows=[announcement('ticketed')];state.truths.mockResolvedValue([{slug:'fixture-ticketed',isSellable:false,tiers:[]}]);expect((await readPublicEvents())[0].sellable).toBe(false);
});
it.each(['partner','school','ticketed'])('saves a title-only %s announcement through the existing authenticated API',async kind=>{
 const response=await save({name:'An honest announcement',kind,status:'announced',tiers:[]});expect(response.status).toBe(200);expect(await response.json()).toMatchObject({ok:true,row:{name:'An honest announcement',status:'announced'}});
 const params=state.q.mock.calls.find(([sql])=>sql.startsWith('INSERT INTO tour_events'))![1];expect(params[3]).toBeNull();expect(params[6]).toBe('');expect(params[11]).toBe('');expect(params[13]).toBe('[]');
 if(kind==='partner')expect(JSON.parse(params[16])).toMatchObject({organizer:'',admission:'unconfirmed'});
});
it('keeps authentication, module permission and Origin mandatory for announcements',async()=>{
 const data={kind:'partner',name:'Private input',status:'announced',tiers:[]};state.admin=false;expect((await save(data)).status).toBe(401);state.admin=true;state.perm=false;expect((await save(data)).status).toBe(403);state.perm=true;state.origin=false;expect((await save(data)).status).toBe(403);expect(state.q).not.toHaveBeenCalled();
});
it('requires a confirmed date and venue before opening ticketed sales',async()=>{
 const response=await save({kind:'ticketed',name:'Not ready for sales',status:'published',tiers:[{name:'Entry',price:500,capacity:100}]});expect(response.status).toBe(400);expect(await response.json()).toMatchObject({error:'event_details_required'});expect(state.q).not.toHaveBeenCalled();
});
it.each(['partner','school','past','ticketed'])('renders a %s announcement without artwork or invented schedule, credits or checkout',async kind=>{
 state.rows=[announcement(kind)];const page=await EventPage({params:Promise.resolve({slug:'fixture-'+kind})});const html=renderToStaticMarkup(kind==='partner'?await PartnerDetails({event:state.rows[0] as unknown as PartnerEventRecord}):page);expect(html).toContain('An honest announcement');expect(html).toContain('Date to be confirmed');expect(html).toContain('Venue to be confirmed');expect(html).toContain('Artwork has not been added');expect(html).not.toContain('Get tickets');expect(html).not.toContain('schema.org/InStock');expect(html).not.toContain('"@type":"Event"');expect(html).not.toContain('private@example.invalid');
});
it('keeps draft details inaccessible',async()=>{
 state.rows=[{...announcement(),status:'draft'}];await expect(EventPage({params:Promise.resolve({slug:'fixture-partner'})})).rejects.toThrow('not_found');
});
it('keeps completed events of every kind in discovery and the portfolio',async()=>{
 state.rows=['school','partner','ticketed','past'].map(kind=>({...announcement(kind),name:kind+' completed fixture',status:'completed'}));
 const rows=await readPublicEvents();expect(publicOwnedEvents(rows,Date.now())).toHaveLength(4);const html=renderToStaticMarkup(await Portfolio({}));for(const kind of ['school','partner','ticketed','past'])expect(html).toContain(kind+' completed fixture');expect(html).not.toContain('For </p>');
 expect(await generateMetadata({params:Promise.resolve({slug:'fixture-ticketed'})})).not.toHaveProperty('robots.index',false);
});
it('renders the Tour Stops calendar from the same published event snapshot',async()=>{
 const page=await TourStops();const html=renderToStaticMarkup(page);
 expect(html).toContain('Calendar &amp; tour stops.');expect(html).toContain('role="grid"');
 expect(html).toContain('An honest announcement');expect(html).toContain('Dates to be confirmed');expect(html).not.toContain('private@example.invalid');
});
