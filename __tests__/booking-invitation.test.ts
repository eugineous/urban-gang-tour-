import {expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {INVITATION_COOLDOWN_MS,invitationAllowedOn,invitationCanOpen,invitationWasDismissed} from '@/lib/client/booking-invitation';
vi.mock('next/navigation',()=>({usePathname:()=>'/'}));
import {BookingInvitation} from '@/ui/components/BookingInvitation';

const ready={eligible:true,privacyReady:true,hidden:false,editing:false,otherOverlay:false,fullscreen:false,focusView:false,width:360};
it('can invite on public discovery pages but never on transaction, staff or contact forms',()=>{
 for(const path of ['/','/shop','/events','/about','/portfolio','/blog/article'])expect(invitationAllowedOn(path)).toBe(true);
 for(const path of ['/admin','/organizer/dashboard','/cart','/checkout','/pay/success','/book','/account','/reels','/contact-us','/privacy-policy','/tickets/order'])expect(invitationAllowedOn(path)).toBe(false);
});
it.each([{privacyReady:false},{hidden:true},{editing:true},{otherOverlay:true},{fullscreen:true},{focusView:true},{eligible:false},{width:279}])('defers the invitation in protected context %s',patch=>expect(invitationCanOpen({...ready,...patch})).toBe(false));
it('can show after consent, on a quiet visible page',()=>expect(invitationCanOpen(ready)).toBe(true));
it('expires a real dismissal instead of hiding the invitation forever',()=>{
 const now=Date.parse('2026-10-21T12:00:00.000Z');
 expect(invitationWasDismissed(String(now-1000),now)).toBe(true);
 expect(invitationWasDismissed(String(now-INVITATION_COOLDOWN_MS),now)).toBe(false);
 for(const value of [null,'shown','bad',String(now+1000)])expect(invitationWasDismissed(value,now)).toBe(false);
});
it('server-renders a closed native dialog without downloading or autoplaying its film',()=>{
 const html=renderToStaticMarkup(createElement(BookingInvitation));
 expect(html).toContain('<dialog');expect(html).not.toContain('<video');expect(html).not.toContain(' open=');
});
it('retains the actual source dimensions and scoped containment rather than stretching the hosts',()=>{
 const source=readFileSync('ui/components/BookingInvitation.tsx','utf8'),css=readFileSync('ui/components/BookingInvitation.module.css','utf8');
 expect(source).toContain('width={768} height={216}');expect(css).toContain('height:auto');expect(css).toContain('object-fit:contain');expect(css).toContain('100dvh - 24px');
 expect(source).not.toContain('ugt-booking-invitation-seen-v1');expect(source).toContain('markAutomaticPopupShown');
});
