import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MobileAppNavigation} from '@/app/_components/MobileAppNavigation';
import {MobileEventDate} from '@/app/_components/MobileEventDate';
import {MobileAppHero} from '@/ui/components/MobileAppHero';
it('provides real mobile destinations and marks shopping context active in the cart',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppNavigation,{path:'/cart'}));
 for(const href of ['/','/events','/shop','/account'])expect(html).toContain('href="'+href+'"');
 expect(html).toContain('href="/shop" aria-current="page"');
});
it.each(['/checkout','/pay/success','/admin','/organizer/dashboard','/receipt/abc','/reels'])('keeps bottom navigation out of the focused flow at %s',path=>{
 expect(renderToStaticMarkup(createElement(MobileAppNavigation,{path}))).toBe('');
});
it('uses real host booking and discovery destinations in the mobile hero',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppHero));expect(html).toContain('href="/book"');expect(html).toContain('href="/events"');expect(html).toContain('eugine-editorial.webp');
});
it('shows the record date without manufacturing a date for an undated event',()=>{
 expect(renderToStaticMarkup(createElement(MobileEventDate,{date:null}))).toBe('');
 expect(renderToStaticMarkup(createElement(MobileEventDate,{date:'2026-02-30'}))).toBe('');
 const html=renderToStaticMarkup(createElement(MobileEventDate,{date:'2026-11-06'}));expect(html).toContain('>6</strong>');expect(html).toMatch(/Nov/i);
});
