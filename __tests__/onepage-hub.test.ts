import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {HomeMicrocards,StoryMicrocards} from '@/ui/components/OnePageHub';

async function renderModules(){
 return renderToStaticMarkup(createElement(HomeMicrocards));
}
async function renderStories(posts:Array<{id:string;headline:string;date:string;img?:string;section?:string;dek?:string;status?:string}>){
 return renderToStaticMarkup(createElement(StoryMicrocards,{posts}));
}
const story=(id:string,date:string,extra={})=>({id,headline:'Story '+id,date,img:'/assets/ugt-logo.png',section:'Culture',dek:'A published tour story.',...extra});

describe('one-page public module microcards',()=>{
 it('makes six real public destinations available as image-led links',async()=>{
  const html=await renderModules();
  for(const href of ['/events','/gallery','/clients','/book','/vendors','/about'])expect(html).toContain(`href="${href}"`);
  expect(html.match(/<img /g)).toHaveLength(6);
  expect(html).toContain('id="explore"');
  expect(html).not.toContain('/admin');
 });
 it('labels each destination and does not introduce another primary heading',async()=>{
  const html=await renderModules();
  expect(html).toContain('Live events');expect(html).toContain('Vendors &amp; partners');
  expect(html.match(/<h3/g)).toHaveLength(6);expect(html).not.toContain('<h1');
 });
});

describe('published story microcards',()=>{
 it('uses real titles, original images and canonical routes in newest order',async()=>{
  const html=await renderStories([story('older','2026-10-29T10:00:00Z'),story('newer','2026-10-31T10:00:00Z')]);
  expect(html.indexOf('href="/blog/newer"')).toBeLessThan(html.indexOf('href="/blog/older"'));
  expect(html).toContain('Story newer');expect(html).toContain('src="/assets/ugt-logo.png"');
  expect(html).toContain('href="/blog"');expect(html).not.toContain('<h1');
 });
 it('does not fabricate stories when the published feed is empty',async()=>{
  expect(await renderStories([])).toBe('');
 });
 it('excludes explicitly private or unsafe records and escapes source text',async()=>{
  const html=await renderStories([
   story('private','2026-10-31',{status:'draft'}),story('../private','2026-10-31'),
   story('safe','2026-10-30',{headline:'<script>bad()</script>'}),
  ]);
  expect(html).not.toContain('/blog/private');expect(html).not.toContain('/blog/..');
  expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');expect(html).not.toContain('<script>');
 });
 it('limits the front door to three genuine stories without substituting stock images',async()=>{
  const html=await renderStories(['a','b','c','d'].map((id,i)=>story(id,`2026-10-${28+i}`,{img:i===3?'':undefined})));
  expect(html.match(/data-story-card=/g)).toHaveLength(3);
  expect(html).not.toContain('/design-assets/');
 });
});
