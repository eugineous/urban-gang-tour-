import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {escapeEmailHtml,renderEmailLetterhead,renderEmailRows} from '@/lib/server/email-letterhead';
const state=vi.hoisted(()=>({q:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,db:()=>({}),hasDb:()=>true}));
vi.mock('@/lib/whatsapp',()=>({isWhatsAppConfigured:()=>false,sendWhatsAppText:vi.fn()}));
import {notifyNewBooking,notifyNewOrder,notifyNewReview} from '@/lib/server/notify';
import {alertCritical} from '@/lib/server/alert';

beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubEnv('RESEND_API_KEY','fixture-key');
 vi.stubEnv('BOOKINGS_FROM','Urban Gang Tour <alerts@urbangangtour.co.ke>');
 state.q.mockImplementation(async (_query:string,params?:unknown[])=>params?.[0]==='notify_email'?[{value:'owner@example.org'}]:params?[{value:true}]:[{key:'alert_email',value:'incidents@example.org'}]);
 state.fetch.mockResolvedValue(new Response(JSON.stringify({id:'fixture-provider-id'}),{status:200}));
 vi.stubGlobal('fetch',state.fetch);
 vi.spyOn(console,'error').mockImplementation(()=>{});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const payload=()=>JSON.parse(state.fetch.mock.calls[0][1].body as string);

describe('responsive business email letterhead',()=>{
 it('escapes all untrusted header, preview and metadata values',()=>{
  expect(escapeEmailHtml(`<&"'>`)).toBe('&lt;&amp;&quot;&#39;&gt;');
  const html=renderEmailLetterhead({title:'<script>alert(1)</script>',eyebrow:'<b>Unsafe</b>',previewText:'<img src=x onerror=alert(1)>',contentHtml:renderEmailRows([['<label>','<img src=x onerror=alert(1)>']])});
  expect(html).not.toContain('<script>');expect(html).not.toContain('<b>Unsafe');
  expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;label&gt;');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
 });
 it('provides fluid Gmail-safe tables, local-brand logo and readable fallbacks without scripts or remote fonts',()=>{
  const html=renderEmailLetterhead({title:'New message',contentHtml:renderEmailRows([['Reference','A'.repeat(400)]])});
  expect(html).toContain('max-width:600px');expect(html).toContain('width="100%"');
  expect(html).toContain('role="presentation"');expect(html).toContain('scope="row"');
  expect(html).toContain('@media only screen and (max-width:480px)');
  expect(html).toContain('word-break:break-word');expect(html).toContain('Arial,Helvetica,sans-serif');
  expect(html).toContain('https://urbangangtour.co.ke/assets/ugt-logo.png');expect(html).toContain('alt="Urban Gang Tour"');
  expect(html).toContain('width:88px;height:auto');expect(html).not.toContain('object-fit:');
  expect(html).not.toMatch(/<script|<iframe|<form|@font-face|fonts\.googleapis/);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
 });
 it('keeps order notification routing, sender, subject and plain text while applying the shared letterhead',async()=>{
  await notifyNewOrder({id:'ORD-fixture',total:1200,status:'pending',name:'<Guest>',email:'guest@example.org',phone:'+254700000000'});
  const data=payload();expect(data.to).toBe('owner@example.org');expect(data.from).toBe('Urban Gang Tour <alerts@urbangangtour.co.ke>');
  expect(data.subject).toBe('New order: KES 1,200');expect(data.text).toContain('New order ORD-fixture');expect(data.text).toContain('Customer: <Guest>');
  expect(data.html).toContain('ugt-email-header');expect(data.html).toContain('&lt;Guest&gt;');expect(data.html).toContain('Order reference');
  expect(data).not.toHaveProperty('cc');expect(state.fetch).toHaveBeenCalledOnce();
 });
 it('preserves booking reference and message details without treating message markup as HTML',async()=>{
  await notifyNewBooking({id:'B-fixture',type:'Partnership',name:'Visitor',org:'<School>',email:'visitor@example.org',message:'<a href="javascript:alert(1)">Hello</a>\nSecond line'});
  const data=payload();expect(data.subject).toBe('New booking: Visitor');expect(data.text).toContain('New booking B-fixture');
  expect(data.html).toContain('New booking enquiry');expect(data.html).toContain('B-fixture');expect(data.html).toContain('&lt;School&gt;');
  expect(data.html).not.toContain('<a href="javascript:');expect(data.html).toContain('&lt;a href=');expect(data.html).toContain('white-space:pre-wrap');
 });
 it('retains explicitly enabled notification settings and does not send disabled notification types',async()=>{
  state.q.mockResolvedValue([{value:false}]);
  await notifyNewOrder({id:'ORD-disabled',total:100});expect(state.fetch).not.toHaveBeenCalled();
 });
 it('uses the same escaped metadata and letterhead for the other routine notification cards',async()=>{
  await notifyNewReview({product:'<Tee>',author:'Reader',rating:5,body:'<script>unsafe</script>'});
  const data=payload();expect(data.html).toContain('ugt-email-header');expect(data.html).toContain('&lt;Tee&gt;');expect(data.html).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
  expect(data.html).not.toContain('<script>');expect(data.text).toContain('<script>unsafe</script>');
 });
 it('adds detailed escaped critical-alert HTML without changing the critical recipient, subject or plain text',async()=>{
  await alertCritical('Reconciliation <failed>','<img src=x onerror=alert(1)>\nAttempt needs review.');
  const data=payload();expect(data.to).toBe('incidents@example.org');expect(data.subject).toBe('[UGT ALERT] Reconciliation <failed>');
  expect(data.text).toContain('Reconciliation <failed>');expect(data.text).toContain('Attempt needs review.');
  expect(data.html).toContain('Operational alert');expect(data.html).toContain('Reconciliation &lt;failed&gt;');
  expect(data.html).not.toContain('<img src=x');expect(data.html).toContain('&lt;img src=x');expect(data).not.toHaveProperty('cc');
 });
 it('still skips all provider calls when the existing email provider is not configured',async()=>{
  vi.stubEnv('RESEND_API_KEY','');
  await notifyNewOrder({id:'ORD-no-provider',total:100});await alertCritical('Test condition','No provider configured');
  expect(state.fetch).not.toHaveBeenCalled();
 });
});
