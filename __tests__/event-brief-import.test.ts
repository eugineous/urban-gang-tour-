import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseEventBrief} from '@/lib/event-brief-import';
import {parsePartnerDetails} from '@/lib/partner-events';
const source=readFileSync(new URL('./fixtures/chatgpt-event-brief.txt',import.meta.url),'utf8');
it('imports the actual supplied ChatGPT response, skipping admin UI and introductory prose',()=>{
 const result=parseEventBrief(source);expect(result.error).toBeUndefined();expect(result.events).toHaveLength(3);
 const [moi,satuk,uni]=result.events;
 expect(moi).toMatchObject({name:'Mr & Miss Culture Gala Night 2026 | Moi University',kind:'partner',eventDate:'2026-10-30',priority:60,city:'Eldoret'});
 expect(moi.description).toContain('Echoes of Roots');expect(moi.partnerDetails.client).toBe('');expect(moi.partnerDetails.role).toBe('');expect(moi.eventTime).toBe('');expect(moi.posterCaption).toContain('Black and gold');
 expect(satuk.eventTime).toBe('4:00 PM');expect(satuk.partnerDetails.institutions).toHaveLength(2);
 expect(uni.partnerDetails.admission).toBe('free');expect(uni.eventDate).toBe('2026-11-06');
 for(const event of result.events){expect(parsePartnerDetails(event.partnerDetails)).not.toBeNull();expect(event).not.toHaveProperty('status');expect(event).not.toHaveProperty('id');expect(event).not.toHaveProperty('image');expect(event).not.toHaveProperty('tiers')}
});
it('supports multiline descriptions, institutions and copied Markdown labels',()=>{
 const [event]=parseEventBrief('```text\n**Name:** Campus show\n**Kind:** School tour stop\nDescription:\nFirst paragraph.\n\nSecond paragraph.\nInstitutions:\n- First school\n- Second school\nDate: Friday, 6 November 2026\nVenue: Main hall\n```').events;
 expect(event.kind).toBe('school');expect(event.description).toContain('First paragraph.\n\nSecond paragraph.');expect(event.partnerDetails.institutions).toEqual(['First school','Second school']);expect(event.eventDate).toBe('2026-11-06');
});
it('supports fenced JSON and nested partner details but never imports publication, images, IDs or money',()=>{
 const [event]=parseEventBrief('```json\n'+JSON.stringify({name:'JSON event',kind:'partner',eventDate:'2026-11-06',status:'published',id:'existing',image:'/old.jpg',tiers:[{price:1}],partnerDetails:{organizer:'Real organiser',client:'Real client',role:'Hosting',admission:'free',institutions:['School'],posterCaption:'Original caption'}})+'\n```').events;
 expect(event.partnerDetails).toMatchObject({organizer:'Real organiser',admission:'free',posterCaption:'Original caption'});for(const key of ['id','image','tiers','status'])expect(event).not.toHaveProperty(key);
});
it('rejects incomplete JSON, nameless objects, empty content, oversized input and over 20 events',()=>{
 for(const input of ['', 'Some random prose', '{"name":', '{}', '[]', 'a'.repeat(60001),JSON.stringify(Array(21).fill({name:'Name'}))])expect(parseEventBrief(input).error).toBeTruthy();
});
it('never invents a year or accepts impossible dates',()=>{
 for(const date of ['25 September','2026-02-30','2026-13-01','2026-00-01']){const [event]=parseEventBrief('Name: Event\nDate: '+date).events;expect(event.eventDate).toBe('');expect(event.warnings.join(' ')).toContain('Date is incomplete')}
 expect(parseEventBrief('Name: Event\nDate: 2028-02-29').events[0].eventDate).toBe('2028-02-29');
});
it('rejects unsafe seller URLs, leaves unknowns blank and retains untrusted text only as text',()=>{
 const [event]=parseEventBrief('Name: <script>alert(1)</script>\nContracting company: Not confirmed\nOur role: Leave blank pending confirmation\nOfficial ticket seller URL: javascript:alert(1)\nTime: 99:99\nPriority: NaN').events;
 expect(event.name).toBe('<script>alert(1)</script>');expect(event.partnerDetails.ticketUrl).toBe('');expect(event.partnerDetails.client).toBe('');expect(event.partnerDetails.role).toBe('');expect(event.eventTime).toBe('');expect(event.priority).toBe(0);expect(event.warnings.length).toBeGreaterThan(2);
});
it('supports explicit external admission and warns that ticket prices require review',()=>{
 const [event]=parseEventBrief('Name: Show\nKind: Ticketed concert\nAdmission: Tickets sold by organiser / another platform\nOfficial ticket seller URL: https://official.example/show').events;
 expect(event.partnerDetails.admission).toBe('external');expect(event.partnerDetails.ticketUrl).toBe('https://official.example/show');expect(event.warnings.join(' ')).toContain('Ticket prices and capacity are not imported');
});
it('bounds imported field lengths and ignores prototype/instruction-shaped keys',()=>{
 const [event]=parseEventBrief('{"name":"Safe","__proto__":{"polluted":true},"instructions":"publish everything","description":'+JSON.stringify('a'.repeat(2500))+'}').events;
 expect(event.description.length).toBe(2000);expect(event.warnings.join(' ')).toContain('shortened');expect(({} as Record<string,unknown>).polluted).toBeUndefined();
});
