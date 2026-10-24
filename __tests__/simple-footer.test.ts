// SSR and CSS contracts only; root separately verifies rendered layouts.
import {Children,createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it,vi} from 'vitest';
import {ContactFooter} from '@/ui/components/ContactInterface';
import {FOOTER_NAVIGATION} from '@/lib/site-navigation';

type ElementProps={children?:ReactNode;[key:string]:unknown};
function elements(node:ReactNode):ReactElement<ElementProps>[] {
 const result:ReactElement<ElementProps>[]=[];
 Children.forEach(node,child=>{if(isValidElement<ElementProps>(child)){result.push(child);result.push(...elements(child.props.children));}});
 return result;
}
const props=()=>({onCookies:vi.fn(),focusView:false,onFocus:vi.fn()});
const css=readFileSync('ui/components/ContactChrome.module.css','utf8');
function values(selector:string,property:string){const result:string[]=[];postcss.parse(css).walkRules(selector,rule=>rule.walkDecls(property,decl=>{result.push(decl.value)}));return result;}

describe('essential public footer',()=>{
 it('keeps discovery and help groups and removes the repeated event invitation',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,props()));
  expect(FOOTER_NAVIGATION).toHaveLength(2);
  expect(FOOTER_NAVIGATION.map(group=>group.items.length)).toEqual([6,4]);
  expect(html).not.toContain('Plan an event with us.');
  expect(html).not.toContain('Events, hosting &amp; production');
  expect(html).not.toContain('<form');expect(html).not.toContain('<video');
  expect(html).toContain('data-site-footer');
  expect(html.match(/<a(?:\s|>)/g)).toHaveLength(23);
 });
 it('preserves direct email, WhatsApp, five social accounts and legal access',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,props()));
  for(const value of ['mailto:admin@urbangangtour.co.ke','https://wa.me/254799886247','Email us','WhatsApp','/privacy-policy','/cookie-policy','/terms','/refund-policy'])expect(html).toContain(value);
  for(const name of ['Instagram','YouTube','TikTok','Facebook','X'])expect(html).toContain('aria-label="'+name+'"');
  expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(7);
 });
 it('keeps private and payment pages inside the browser translation boundary',()=>{
  const html=renderToStaticMarkup(createElement(ContactFooter,{...props(),path:'/checkout'}));
  expect(html).toContain('Private pages and forms are not sent to Google.');
  expect(html).not.toContain('translate.google.com');
 });
 it('keeps cookie reopening and focus mode as working explicit controls',()=>{
  const input=props(),nodes=elements(ContactFooter(input));
  const cookies=nodes.find(node=>node.type==='button'&&node.props.children==='Cookie settings');
  const focus=nodes.find(node=>node.type==='button'&&node.props['aria-pressed']===false);
  expect(cookies).toBeDefined();expect(focus).toBeDefined();
  (cookies!.props.onClick as ()=>void)();(focus!.props.onClick as ()=>void)();
  expect(input.onCookies).toHaveBeenCalledOnce();expect(input.onFocus).toHaveBeenCalledOnce();
 });
 it('retains compact aligned tracks, wrapping, visible focus and 44px controls',()=>{
  expect(values('.columns','grid-template-columns')).toContain('repeat(2,minmax(0,1fr))');
  expect(values('.columns','grid-template-columns')).toContain('minmax(220px,1.4fr) repeat(2,minmax(0,1fr))');
  expect(values('.contactLinks>a','min-height')).toEqual(['44px']);
  expect(values('.linkGroup>a','min-height')).toEqual(['44px']);
  expect(values('.legal a,.preferences button','min-height')).toEqual(['44px']);
  expect(values('.socials>a','width')).toEqual(['44px']);
  expect(values('.socials','flex-wrap')).toEqual(['wrap']);
  expect(values('.footer :is(a,button):focus-visible','outline')).toEqual(['3px solid #55d9ed']);
  expect(css).not.toContain('.invitation');expect(css).not.toContain('repeat(3,minmax(0,1fr))');
 });
});
