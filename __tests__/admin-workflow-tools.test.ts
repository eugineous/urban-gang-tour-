import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {whatsappUrl,emailComposeLinks,productCategories,clearSentReply} from '@/lib/contact-actions';
import {ContactEmail,ContactPhone} from '@/app/admin/ContactActions';
import {runUploadQueue,type QueueItem} from '@/lib/client/upload-queue';
import {readFileSync} from 'node:fs';

it.each(['0712 345 678','712345678','+254712345678','00254712345678'])('normalises Kenyan WhatsApp number %s',input=>expect(whatsappUrl(input)).toBe('https://wa.me/254712345678'));
it('supports the newer Kenyan prefix, international numbers and encoded prefilled text',()=>{expect(whatsappUrl('112345678')).toBe('https://wa.me/254112345678');expect(whatsappUrl('+44 7700 900123','Hello & goodbye')).toBe('https://wa.me/447700900123?text=Hello%20%26%20goodbye')});
it('does not create broken or executable links from invalid contact fields',()=>{
 for(const input of ['','123','javascript:alert(1)','07123 or 07145'])expect(whatsappUrl(input)).toBeNull();
 for(const input of ['bad','user@example.com\r\nBcc:other@example.com','user@example.com?subject=evil'])expect(emailComposeLinks(input)).toBeNull();
 expect(renderToStaticMarkup(createElement(ContactPhone,{value:'123'}))).not.toContain('href=');
 expect(renderToStaticMarkup(createElement(ContactEmail,{value:'bad'}))).not.toContain('href=');
});
it('offers both mail-app and Gmail compose without sending a message',()=>{
 const links=emailComposeLinks('owner@example.com')!;expect(links.mailto).toBe('mailto:owner%40example.com');expect(links.gmail).toBe('https://mail.google.com/mail/?view=cm&fs=1&to=owner%40example.com');
 const html=renderToStaticMarkup(createElement(ContactEmail,{value:'owner@example.com'}));expect(html).toContain('Open Gmail');expect(html).toContain('noopener noreferrer');
});
it('keeps new product categories instead of restricting them to three choices',()=>{expect(productCategories(['Custom gifts','Apparel',' Custom gifts '])).toEqual(['Accessories','Apparel','Custom gifts','Headwear'])});
it('only clears the exact message draft that was sent, never newly edited text or another conversation',()=>{
 const original={'mail:a':'Sent text','mail:b':'Other draft'};expect(clearSentReply(original,'mail:a','Sent text')).toEqual({'mail:b':'Other draft'});expect(original['mail:a']).toBe('Sent text');
 const edited={...original,'mail:a':'New edits while sending'};expect(clearSentReply(edited,'mail:a','Sent text')).toBe(edited);
});
const item=(id:string,state:QueueItem['state']='pending')=>({id,file:new File(['image'],id+'.png',{type:'image/png'}),path:'gallery/'+id+'.png',category:'Category',state,progress:0});
it('uploads serially, keeps failed photos and continues instead of dropping the rest',async()=>{
 const events:string[]=[],updates:Record<string,Partial<QueueItem>>={};let active=0;
 await runUploadQueue([item('a'),item('bad'),item('b')],async photo=>{expect(++active).toBe(1);events.push(photo.id);await Promise.resolve();active--;if(photo.id==='bad')throw new Error('offline')},(id,patch)=>updates[id]={...updates[id],...patch});
 expect(events).toEqual(['a','bad','b']);expect(updates.a.state).toBe('done');expect(updates.bad.state).toBe('failed');expect(updates.b.state).toBe('done');
});
it('never reuploads completed photos and allows a failed photo to retain its stored URL for retry',async()=>{
 const retry={...item('retry','failed'),url:'/media/gallery/already-uploaded.png'};const work=vi.fn(async()=>{});
 await runUploadQueue([item('done','done'),retry],work,()=>{});expect(work).toHaveBeenCalledTimes(1);expect(work.mock.calls[0][0]).toEqual(retry);
});
it('keeps navigation, stale-response protection and per-message drafts wired into the real modules',()=>{
 const admin=readFileSync(new URL('../app/admin/AdminApp.tsx',import.meta.url),'utf8');expect(admin).toContain('history.pushState');expect(admin).toContain("addEventListener('popstate'");expect(admin).toContain('if(active)setRows(next)');expect(admin).toContain("openedTools.includes('Events')");expect(admin).toContain('The story was not saved. Your changes are still here.');
 const gmail=readFileSync(new URL('../app/admin/GmailInbox.tsx',import.meta.url),'utf8');expect(gmail).not.toContain("useEffect(() => { setReply(''); }");expect(gmail).toContain("draft.store.clear(sentKey,{subject:'',body:sentText})");expect(gmail).toContain('draft.store.sendReference');expect(gmail).toContain('sendingRef.current=false;setSending(false)');expect(gmail).toContain('fetchWithTimeout');
 expect(admin).toContain("openedTools.includes('Bookings')");expect(admin).toContain('rows={bookingRows}');
});
