import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({usePathname:()=>'/'}));
import {AppShell} from '@/app/_components/AppShell';
import {readFileSync} from 'node:fs';

it('offers a real shop search, cart, and accessible mobile navigation',()=>{
 const html=renderToStaticMarkup(createElement(AppShell,null,'Content'));
 expect(html).toContain('action="/shop"');
 expect(html).toContain('name="q"');
 expect(html).toContain('href="/cart"');
 expect(html).toContain('aria-controls="site-menu"');
 expect(html.match(/aria-controls="site-menu"/g)).toHaveLength(2);
 expect(html).toContain('href="https://wa.me/254799886247"');
 expect(html).toContain('href="/#merchandise-catalogue"');
});

it('resets inherited form-input spacing in the compact public search',()=>{
 const css=readFileSync(new URL('../app/navigation.css',import.meta.url),'utf8');
 const rule=css.match(/\.storefront-search input\{([^}]+)\}/)?.[1];
 expect(rule).toContain('min-height:44px');
 expect(rule).toContain('margin:0');
});
