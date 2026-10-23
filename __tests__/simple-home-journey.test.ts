// SSR/CSS checks; actual browser fit and interactions are verified separately.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {describe,expect,it} from 'vitest';
import Site from '@/ui/components/Site';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
const render=(pageContent:typeof WEBSITE_DEFAULTS[string]|null=null)=>renderToStaticMarkup(createElement(Site,{path:'/',query:{},screens:[],products:[],events:[],posts:[],pageContent}));
describe('simple home entry',()=>{
 it('offers exactly Events, Shop and Book in the hero with real destinations',()=>{
  const hero=render().split('data-home-hero')[1].split('</section>')[0];
  const actions=hero.split('data-home-actions')[1].split('</nav>')[0];
  expect(actions.match(/<a\s/g)).toHaveLength(3);
  for(const [label,href] of [['Events','/events'],['Shop','/shop'],['Book','/book']])expect(actions).toContain('href="'+href+'">'+label);
  expect(hero).not.toContain('2022');expect(hero).not.toContain('Find an event');expect(hero).not.toContain('Shop merchandise');
 });
 it('preserves the underlying archive and owner-written title/summary/media',()=>{
  const html=render({...WEBSITE_DEFAULTS['/'],title:'Owner title',summary:'Owner summary',image:'/uploads/owner.jpg'});
  expect(html).toContain('Owner title');expect(html).toContain('Owner summary');expect(html).toContain('/uploads/owner.jpg');
  expect(html).toContain('href="/gallery/uon-mr-miss-2022"');
 });
 it('uses a single uniform three-column action style with readable wrapping and touch height',()=>{
  const css=readFileSync('ui/components/HomeSections.module.css','utf8'),values:string[]=[];
  postcss.parse(css).walkRules('.heroActions',r=>r.walkDecls('grid-template-columns',d=>{values.push(d.value)}));
  expect(values).toEqual(['repeat(3,minmax(0,1fr))']);
  expect(css).toContain('.heroAction{display:inline-flex;');expect(css).toContain('min-block-size:44px');
  expect(css).not.toContain('.heroBook');expect(css).not.toContain('.heroShop');expect(css).not.toContain('.archive');
 });
});
