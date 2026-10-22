// SSR/static contracts, deliberately not described as rendered device checks.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import postcss from 'postcss';
import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({usePathname:vi.fn()}));
import {usePathname} from 'next/navigation';
import {AppShell} from '@/app/_components/AppShell';
it('ships one labeled menu, no hidden alternate Shop/About controls, and one main',()=>{
 vi.mocked(usePathname).mockReturnValue('/shop/example');
 const html=renderToStaticMarkup(createElement(AppShell,null,createElement('h1',null,'Example')));
 expect(html.match(/class="site-header"/g)).toHaveLength(1);
 expect(html).toContain('aria-controls="site-menu"');expect(html).toContain('class="mobile-menu-label">Menu</span>');
 expect(html.match(/<button[^>]*class="menu-toggle"[^>]*>/)?.[0]).not.toContain('aria-label=');
 expect(html).not.toContain('desktop-menu-label');expect(html).toContain('href="/contact-us"><span class="header-rolling-label"');
 expect(html).toContain('class="tickets-link" href="/account"');
 expect(html).not.toContain('mobile-shop-link');expect(html).not.toContain('mobile-about-link');
 expect(html).toContain('href="/shop" aria-current="page"');expect(html).toContain('aria-label="Account and help"');
 expect(html.match(/<main(?:\s|>)/g)).toHaveLength(1);expect(html).toContain('<dialog');
});
it('gives header/menu layout a single stylesheet owner instead of accumulating overrides',()=>{
 const sources=readdirSync('app').filter(f=>f.endsWith('.css')&&f!=='navigation.css');
 for(const file of sources){const root=postcss.parse(readFileSync('app/'+file,'utf8'));root.walkRules(rule=>expect(rule.selector,file).not.toMatch(/\.(?:site-header|desktop-nav|header-actions|menu-panel|menu-toggle)(?![\w-])/));}
 const css=readFileSync('app/navigation.css','utf8');expect(css).toContain('min-height:44px');expect(css).toContain('max-height:calc(100dvh - 24px)');expect(css).toContain('overflow:auto');expect(css).toContain('dialog.menu-panel:not([open])');
});
it('keeps action text wrapping, stable hit targets and valid admin font declarations',()=>{
 const publicCss=readFileSync('app/interaction-foundations.css','utf8'),admin=readFileSync('app/admin/control-room.css','utf8');
 expect(publicCss).toContain('.application-content .button:is(:hover,:active,:focus-visible){transform:none}');
 expect(publicCss).toContain('white-space:normal');expect(admin).not.toMatch(/font:[^;}]*\s+inherit/);
 expect(admin).not.toContain('minmax(0,2fr) repeat(auto-fit');
});
it('checks all JSX surfaces for empty targets, ambiguous native submits and unsafe new windows',()=>{
 const result=JSON.parse(execFileSync('node',['scripts/control-contract-audit.mjs','--check'],{encoding:'utf8'}));
 expect(result.files).toBeGreaterThan(150);expect(result.findings).toEqual([]);
});
