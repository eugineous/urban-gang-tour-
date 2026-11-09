import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MobileAppNavigation} from '@/app/_components/MobileAppNavigation';
import {MobileEventDate} from '@/app/_components/MobileEventDate';
import {MobileAppHero} from '@/ui/components/MobileAppHero';
it('provides real mobile destinations and marks shopping context active in the cart',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppNavigation,{path:'/cart'}));
 for(const href of ['/','/events','/shop','/account','/contact-us'])expect(html).toContain('href="'+href+'"');
 expect(html).toContain('href="/shop" aria-current="page"');
});
it('marks the direct contact destination active in mobile navigation',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppNavigation,{path:'/contact-us'}));
 expect(html).toContain('href="/contact-us" aria-current="page"');
});
it('renders the brand headline without a decorative dot',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppHero));
 const heading=html.match(/<h1>(.*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g,'');
 expect(heading).toBe('URBANGANGTOUR');
});
it.each(['/checkout','/pay/success','/admin','/organizer/dashboard','/receipt/abc','/reels'])('keeps bottom navigation out of the focused flow at %s',path=>{
 expect(renderToStaticMarkup(createElement(MobileAppNavigation,{path}))).toBe('');
});
it('uses real host booking and discovery destinations in the mobile hero',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppHero));expect(html).toContain('href="/book"');expect(html).toContain('href="/events"');expect(html).toContain('eugine-editorial.webp');
});
it('presents both named hosts in the hero while keeping the booking card artwork',()=>{
 const html=renderToStaticMarkup(createElement(MobileAppHero));
 expect(html).toContain('srcSet="/assets/mobile/hosts-editorial.webp"');
 expect(html).toContain('alt="Illustrated portrait of Eugine Micah and Lucy Ogunde in black T-shirts"');
 expect(html).toContain('srcSet="/assets/mobile/eugine-editorial.webp"');
});
it('shows the record date without manufacturing a date for an undated event',()=>{
 expect(renderToStaticMarkup(createElement(MobileEventDate,{date:null}))).toBe('');
 expect(renderToStaticMarkup(createElement(MobileEventDate,{date:'2026-02-30'}))).toBe('');
 const html=renderToStaticMarkup(createElement(MobileEventDate,{date:'2026-11-06'}));expect(html).toContain('>6</strong>');expect(html).toMatch(/Nov/i);
});
