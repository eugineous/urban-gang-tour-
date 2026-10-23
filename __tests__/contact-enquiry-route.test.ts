import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({db:true,limited:false,after:[] as (()=>Promise<void>)[]}));
vi.mock('next/server',async()=>{const actual=await vi.importActual<typeof import('next/server')>('next/server');return {...actual,after:vi.fn((fn:()=>Promise<void>)=>state.after.push(fn))};});
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.db}));
vi.mock('@/lib/server/ratelimit',()=>({rateLimit:vi.fn(()=>!state.limited),clientIp:()=> 'test-ip'}));
vi.mock('@/lib/server/contact-email-outbox',()=>({saveContactEnquiry:vi.fn(async()=>({reference:'C-reference',jobId:'contact-job',status:'queued'})),deliverContactEmailJob:vi.fn(async()=> 'accepted')}));
import {POST} from '@/app/api/contact/route';
import {saveContactEnquiry,deliverContactEmailJob} from '@/lib/server/contact-email-outbox';
import {parseContactEnquiry} from '@/lib/server/contact-enquiries';
import {rateLimit} from '@/lib/server/ratelimit';
const valid={name:'Visitor Example',email:'visitor@example.test',subject:'A hosting enquiry',message:'Please discuss an upcoming campus event with us.',requestId:'random-contact-request-id-12345',privacyAccepted:true,website:''};
function request(body:unknown=valid,origin='https://urbangangtour.co.ke'){return new Request('https://urbangangtour.co.ke/api/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
describe('public contact submission',()=>{
 beforeEach(()=>{vi.clearAllMocks();state.db=true;state.limited=false;state.after=[];vi.mocked(saveContactEnquiry).mockResolvedValue({reference:'C-reference',jobId:'contact-job',status:'queued'});});
 afterEach(()=>vi.restoreAllMocks());
 it('saves before acknowledging a queued message and defers provider work',async()=>{
  const response=await POST(request());expect(response.status).toBe(202);expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(await response.json()).toEqual({ok:true,id:'C-reference',delivery:'queued'});expect(saveContactEnquiry).toHaveBeenCalledWith({name:valid.name,email:valid.email,subject:valid.subject,message:valid.message},valid.requestId);
  expect(deliverContactEmailJob).not.toHaveBeenCalled();expect(state.after).toHaveLength(1);await state.after[0]();expect(deliverContactEmailJob).toHaveBeenCalledWith('contact-job');
 });
 it('passes the actual request to per-device limiting with a network backstop',async()=>{const req=request();await POST(req);expect(rateLimit).toHaveBeenCalledWith('contact:test-ip',5,600000,req,300);});
 it('rejects an untrusted origin before storage',async()=>{expect((await POST(request(valid,'https://attacker.test'))).status).toBe(403);expect(saveContactEnquiry).not.toHaveBeenCalled();});
 it('bounds real streamed bodies and rejects arrays and extra fields',async()=>{
  expect((await POST(request({...valid,message:'x'.repeat(17000)}))).status).toBe(413);
  expect((await POST(request([]))).status).toBe(400);expect((await POST(request({...valid,to:'attacker@example.test'}))).status).toBe(400);expect(saveContactEnquiry).not.toHaveBeenCalled();
 });
 it('rejects header injection, invalid reply emails, missing consent and a filled honeypot',async()=>{
  for(const update of [{subject:'Hello\r\nBcc: attacker@example.test'},{email:'visitor@example.test\r\nBcc:attacker@example.test'},{privacyAccepted:false},{website:'https://bot.test'}])expect((await POST(request({...valid,...update}))).status).toBe(400);
  expect(saveContactEnquiry).not.toHaveBeenCalled();
 });
 it('keeps rate-limit, missing-store, conflict and persistence failures explicit',async()=>{
  state.limited=true;expect((await POST(request())).status).toBe(429);state.limited=false;state.db=false;expect((await POST(request())).status).toBe(503);state.db=true;
  vi.mocked(saveContactEnquiry).mockRejectedValueOnce(Error('request_details_changed'));expect((await POST(request())).status).toBe(409);
  vi.mocked(saveContactEnquiry).mockRejectedValueOnce(Error('private database detail'));const failed=await POST(request());expect(failed.status).toBe(503);expect(await failed.json()).toEqual({error:'contact_unavailable'});
 });
 it('normalises harmless whitespace without accepting control characters',()=>{expect(parseContactEnquiry({...valid,email:' VISITOR@EXAMPLE.TEST ',subject:' Hosting enquiry '}).enquiry.email).toBe('visitor@example.test');expect(()=>parseContactEnquiry({...valid,message:'Hi\u0000bad content'})).toThrow('invalid_message');});
});
