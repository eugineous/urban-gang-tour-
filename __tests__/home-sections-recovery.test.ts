import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import Site from '@/ui/components/Site';
import {WEBSITE_DEFAULTS} from '@/lib/website-content';
function render(path='/',pageContent:typeof WEBSITE_DEFAULTS[string]|null=null){return renderToStaticMarkup(createElement(Site,{path,query:{},screens:[],products:[],events:[],posts:[],pageContent}));}
function faq(html:string){return html.slice(html.indexOf('aria-label="Booking questions"'));}
it('restores inline native home questions without requiring JavaScript to open answers',()=>{
 const html=render('/',WEBSITE_DEFAULTS['/']);
 expect((html.match(/<h1(?:\s|>)/g)||[])).toHaveLength(1);
 expect((faq(html).match(/<details(?:\s|>)/g)||[])).toHaveLength(5);
 expect(html).toContain('<summary>');expect(html).toContain('Can you bring the tour to our school?');
 expect(html).toContain('Sending a request does not confirm a booking.');
 expect(html).toContain('href="/faq"');expect(html).not.toContain('aria-hidden="true" inert=""');
});
it('preserves published home questions and dedicated FAQ editor intent, including explicit empty FAQ',()=>{
 const content={...WEBSITE_DEFAULTS['/'],faqs:[{question:'My <question>?',answer:'My <answer>.'}]};
 const home=render('/',content);expect(home).toContain('My &lt;question&gt;?');expect(home).toContain('My &lt;answer&gt;.');
 expect((faq(home).match(/<details(?:\s|>)/g)||[])).toHaveLength(1);
 expect(render('/faq',{...WEBSITE_DEFAULTS['/faq'],faqs:[]})).not.toContain('<details');
 expect((render('/faq').match(/<details(?:\s|>)/g)||[])).toHaveLength(5);
});
it('makes public destinations discoverable through owned-image microcards without invented endorsements',()=>{
 const html=render();
 for(const [key,url] of [['events','/events'],['gallery','/gallery'],['clients','/clients'],['book','/book'],['vendors','/vendors'],['about','/about']]){
  const card=html.match(new RegExp('<a[^>]*href="'+url+'"[^>]*data-module-card="'+key+'"[\\s\\S]*?</a>'))?.[0];
  expect(card).toBeDefined();expect(card).toContain('src="/media-library/');
 }
 expect(html).not.toContain('600+');expect(html).not.toContain('Trusted by millions');
});
it('keeps motion progressive, reduced-motion aware and responsive without hiding static content',()=>{
 const css=readFileSync('ui/components/HomeSections.module.css','utf8');
 expect(css).not.toMatch(/opacity\s*:\s*0\b/);
 expect(css).toContain('prefers-reduced-motion:reduce');expect(css).toContain('html[data-focus-view=true]');
 expect(css).toContain('max-width:700px');expect(css).toContain('min-inline-size:0');
 // A responsive @media(min-width:...) breakpoint is not a fixed-width
 // declaration. Reject actual declarations without rejecting tablet queries.
 const fixedMinimum=/(?:^|[;{])\s*min-(?:inline-size|width):\s*\d{3,}px/;
 expect(css).not.toMatch(fixedMinimum);
 expect('@media(min-width:701px){.card{min-inline-size:0}}').not.toMatch(fixedMinimum);
 expect('.card{min-width:701px}').toMatch(fixedMinimum);
 expect('.card{color:red;min-inline-size:701px}').toMatch(fixedMinimum);
});
