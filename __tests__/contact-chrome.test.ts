// SSR/CSS source contracts, not rendered device verification.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({usePathname:vi.fn()}));
import {usePathname} from 'next/navigation';
import {AppShell} from '@/app/_components/AppShell';
import {ContactFooter,FloatingTalk} from '@/ui/components/ContactInterface';
import {FOOTER_NAVIGATION} from '@/lib/site-navigation';
describe('recovered public chrome',()=>{
 it('organizes essential footer links into two compact groups with direct contact and policies',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,{onCookies:()=>{},focusView:false,onFocus:()=>{}}));
  for(const group of FOOTER_NAVIGATION){expect(html).toContain('aria-label="'+group.title+'"');for(const [label,href] of group.items){expect(html).toContain('href="'+href+'"');expect(html).toContain(label.replaceAll('&','&amp;'));}}
  expect(html).toContain('aria-label="Policies"');expect(html).toContain('href="/contact-us"');
  expect(html).not.toContain('footer-secondary');expect(html).not.toContain('footer-socials');
  expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(6);
  expect(html.match(/<button type="button"/g)).toHaveLength(2);
 });
 it('has no repeated destination across the two footer menu groups',()=>{
  const links=FOOTER_NAVIGATION.flatMap(group=>group.items).map(([,href])=>href);
  expect(new Set(links).size).toBe(links.length);
 });
 it('restores direct desktop contact without an extra click or an unrequested video',()=>{
  const html=renderToStaticMarkup(createElement(FloatingTalk));
  expect(html).toContain('href="/contact-us"');expect(html).toContain('Let’s talk');expect(html).not.toContain('<button');expect(html).not.toContain('<video');
 });
 it.each(['/','/experience','/events'])('keeps direct contact and removes the automatic host invitation on %s',path=>{
  vi.mocked(usePathname).mockReturnValue(path);
  const html=renderToStaticMarkup(createElement(AppShell,null,createElement('h1',null,'Example')));
  expect(html).toContain('class="start-link" href="/contact-us"');
  expect(html).toContain('Let’s talk');expect(html).not.toContain('data-host-invitation');
  expect(html).not.toMatch(/<dialog[^>]* open(?:[=> ])/);
  expect(html.match(/<main(?:\s|>)/g)).toHaveLength(1);
 });
 it('keeps the hamburger icon mobile-only and preserves laptop navigation',()=>{
  const css=readFileSync('app/navigation.css','utf8');
  expect(css).toContain('.desktop-nav{display:none;');
  expect(css).toContain('@media(min-width:1024px){');
  expect(css).not.toContain('@media(min-width:1024px) and (hover:hover)');
  expect(css).toContain('.desktop-nav{display:flex}');
  expect(css).toContain('.site-header .menu-toggle{display:none}');
  expect(css).toContain('html[data-phone-viewport=wide] .desktop-nav{display:none}');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');expect(css).toContain('html[data-focus-view=true]');
 });
 it.each(['/cart','/checkout','/book','/account','/shop','/reels','/admin','/organizer/dashboard','/organizer/login','/organizer/signup','/organizer/forgot'])('does not place automatic host popups or floating launchers over %s',path=>{
  vi.mocked(usePathname).mockReturnValue(path);
  const html=renderToStaticMarkup(createElement(AppShell,null,createElement('h1',null,'Example')));
  expect(html).not.toContain('data-contact-launcher');expect(html).not.toContain('data-host-invitation');
 });
 it('gives the scoped footer proper grid tracks and narrow-screen collapse without old global classes',()=>{
  const css=readFileSync('ui/components/ContactChrome.module.css','utf8');
  expect(css).toContain('repeat(2,minmax(0,1fr))');expect(css).toContain('align-items:start');
  expect(css).toContain('@container site-footer (min-width:700px)');expect(css).toContain('@container site-footer (max-width:300px)');
  expect(css).toContain('min-height:44px');expect(css).toContain('max-height:44px');expect(css).toContain('flex-wrap:wrap');expect(css).toContain('overflow-wrap:break-word');
 });
 it('does not restart the moving client rail while a keyboard user is on a logo',()=>{
  const declarations:string[]=[];
  for(const file of ['app/design.css','app/refinements.css'])postcss.parse(readFileSync(file,'utf8')).walkRules('.logo-roll:focus-within .logo-roll-track',rule=>{rule.walkDecls('animation-play-state',decl=>{declarations.push(decl.value)})});
  expect(declarations.length).toBeGreaterThan(0);expect(declarations.every(value=>value==='paused')).toBe(true);
 });
});
