import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import Site from '@/ui/components/Site';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
describe('homepage video remains the front door',()=>{
 it('keeps an owner-selected image as a fallback without removing the tour video',()=>{
  const html=renderToStaticMarkup(createElement(Site,{path:'/',query:{},screens:[],products:[],events:[],posts:[],initialNow:0,pageContent:{...WEBSITE_DEFAULTS['/'],image:'/owner-poster.webp'}}));
  expect(html).toContain('src="/owner-poster.webp"');
  expect(html).toContain('<video');
  expect(html).toContain('playsInline');
  expect(html).toContain('data-home-actions');
 });
 it('puts the newest publication first even when the feed arrives out of order',()=>{
  const posts=[{id:'older',headline:'Earlier report',date:'2026-10-23T18:00:00Z'},{id:'morning',headline:'Morning report',date:'2026-10-24T06:00:00Z'},{id:'evening',headline:'Evening report',date:'2026-10-24T18:00:00Z'}];
  const html=renderToStaticMarkup(createElement(Site,{path:'/',query:{},screens:[],products:[],events:[],posts,initialNow:0}));
  expect(html.indexOf('Evening report')).toBeLessThan(html.indexOf('Morning report'));
  expect(html.indexOf('Morning report')).toBeLessThan(html.indexOf('Earlier report'));
 });
});
