// Source/SSR contracts; root performs rendered responsive and interaction checks.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({usePathname:vi.fn()}));
import {usePathname} from 'next/navigation';
import {AppShell} from '@/app/_components/AppShell';
import {FOOTER_NAVIGATION,PRIMARY_NAVIGATION,SITE_MENU_GROUPS,SITE_UTILITY_NAVIGATION,isNavigationCurrent} from '@/lib/site-navigation';

it('orders discovery, proof and trust before shopping and booking, with Gallery in the main navigation',()=>{
 expect(PRIMARY_NAVIGATION).toEqual([['Events','/events'],['Our work','/portfolio'],['Gallery','/gallery'],['Clients','/clients'],['About','/about'],['Shop','/shop'],['Book','/book']]);
 expect(SITE_MENU_GROUPS).toHaveLength(1);
 expect(SITE_MENU_GROUPS.flatMap(group=>group.items)).toEqual(PRIMARY_NAVIGATION);
 expect(SITE_UTILITY_NAVIGATION).toEqual([['My tickets','/account']]);
 expect(isNavigationCurrent('/shop/cb-oversized-tee','/shop')).toBe(true);
 expect(isNavigationCurrent('/shopper','/shop')).toBe(false);
});

it('keeps a compact footer with support and seller entry without deleting canonical routes',()=>{
 expect(FOOTER_NAVIGATION.map(group=>group.title)).toEqual(['Explore','Help']);
 const footer=FOOTER_NAVIGATION.flatMap(group=>group.items);
 expect(footer).toHaveLength(10);
 for(const href of ['/events','/shop','/portfolio','/clients','/blog','/about','/account','/organizer/login','/contact-us','/accessibility'])expect(footer.some(([,target])=>target===href)).toBe(true);
});

it('routes the restored shopping cart symbol to Shop and renders seven matching desktop/mobile primary links',()=>{
 vi.mocked(usePathname).mockReturnValue('/shop/example');
 const html=renderToStaticMarkup(createElement(AppShell,null,createElement('h1',null,'Example')));
 expect(html).toContain('class="cart-link" href="/shop" aria-label="Shop" aria-current="page"');
 expect(html).not.toContain('aria-label="View your cart"');
 const menu=html.slice(html.indexOf('<div class="menu-groups">'),html.indexOf('<div class="menu-bottom">'));
 expect(menu.match(/<a\s/g)).toHaveLength(7);
 expect(menu).toContain('href="/gallery"');
 const desktop=html.slice(html.indexOf('<nav class="desktop-nav"'),html.indexOf('</nav>'));
 expect(desktop.match(/<a\s/g)).toHaveLength(7);
 expect(desktop).toContain('href="/gallery"');
 expect(menu).not.toContain('<h2');
 expect(html).toContain('class="tickets-link" href="/account"');
 expect(html).toContain('class="header-rolling-label"');
 expect(html.match(/<header class="site-header"/g)).toHaveLength(1);
 expect(html.match(/<main(?:\s|>)/g)).toHaveLength(1);
 expect(readFileSync('app/_components/AppShell.tsx','utf8')).toContain('<ShoppingCart size={21}');
});

it('removes the automatic host invitation rather than hiding its visible box',()=>{
 const source=readFileSync('app/_components/AppShell.tsx','utf8');
 expect(source).not.toContain('BookingInvitation');
 expect(source).not.toContain('<LanguageChooser');
 expect(source).toContain('if(dialog.open)dialog.close()');
 expect(source).toContain('document.body.style.overflow=previous');
 expect(source).toContain('returnFocus.focus()');
});

it('keeps explicit native language selection in the footer with no header language button',()=>{
 vi.mocked(usePathname).mockReturnValue('/about');
 const html=renderToStaticMarkup(createElement(AppShell,null,createElement('h1',null,'Example')));
 const header=html.slice(html.indexOf('<header'),html.indexOf('</header>'));
 expect(header).not.toContain('data-language-control');
 expect(html.match(/data-language-control/g)).toHaveLength(1);
 expect(html.indexOf('data-language-control')).toBeGreaterThan(html.indexOf('data-site-footer'));
 expect(html).toContain('Your choice applies immediately.');
 expect(html.match(/<option\b/g)).toHaveLength(6);
 expect(html).not.toContain('value="auto"');
});

it('shows desktop navigation by viewport width, including touch laptops, without an overflow-menu fallback',()=>{
 const css=readFileSync('app/navigation.css','utf8'),root=postcss.parse(css);
 expect(css).not.toContain('@media(min-width:1024px) and (hover:hover)');
 expect(css).not.toContain('@container public-header (max-width:960px)');
 let desktop=false;
 root.walkAtRules('media',at=>{
  if(at.params!=='(min-width:1024px)')return;
  const values=new Map<string,string>();
  at.walkRules(rule=>rule.walkDecls('display',decl=>{values.set(rule.selector,decl.value)}));
  expect(values.get('.desktop-nav')).toBe('flex');
  expect(values.get('.site-header .menu-toggle')).toBe('none');
  desktop=true;
 });
 expect(desktop).toBe(true);
 expect(css).toContain('dialog.menu-panel:not([open]){display:none}');
 expect(css).toContain('.header-rolling-label>span');
 expect(css).toContain('@media(prefers-reduced-motion:reduce)');
});

it('keeps short-screen primary links in a compact two-column menu and preserves touch targets',()=>{
 const css=readFileSync('app/navigation.css','utf8');
 let short=false;
 postcss.parse(css).walkAtRules('media',at=>{
  if(at.params!=='(max-height:500px)')return;
  const rules=new Map<string,string>();at.walkRules(rule=>{rules.set(rule.selector,rule.toString())});
  expect(rules.get('.menu-groups nav')).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
  expect(rules.get('.menu-groups nav a')).toContain('min-height:44px');
  short=true;
 });
 expect(short).toBe(true);
 expect(css).toContain('overflow:auto;overscroll-behavior:contain');
});
