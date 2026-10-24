import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import Site from '@/ui/components/Site';
import library from '@/ui/data/media-library.json';

function renderClients(){
  return renderToStaticMarkup(createElement(Site,{path:'/clients',query:{},screens:[],products:[],events:[],posts:[]}));
}

it('connects clients to matching owned school, campus and broadcast archives',()=>{
  const html=renderClients();
  for(const path of [
    '/gallery/school-lari','/gallery/school-loreto','/gallery/school-gituamba',
    '/gallery/school-koinange','/gallery/machakos-campus','/gallery/kips-campus-rave',
    '/gallery/uon-mr-miss-2022','/gallery/urban-news','/work-with-us',
  ]) expect(html).toContain(`href="${path}"`);
  expect(html).toContain('href="/partners"');
  expect(html).toContain('href="/portfolio"');
});

it('makes the client categories navigable before the logo directory',()=>{
  const html=renderClients();
  expect(html).toContain('aria-label="Client archive sections"');
  for(const id of ['client-schools','client-campuses','client-media']){
    expect(html).toContain(`href="#${id}"`);
    expect(html).toContain(`id="${id}"`);
  }
  expect((html.match(/<h1(?:\s|>)/g)||[])).toHaveLength(1);
});

it('preserves supplied logo identities while separating adult campaigns from school work',()=>{
  const html=renderClients();
  const logos=library.assets.filter(item=>item.kind==='logo');
  expect(logos).toHaveLength(22);
  for(const logo of logos){
    expect(html).toContain(`src="${logo.src}"`);
    expect(html).toContain(logo.title.replaceAll('&','&amp;'));
  }
  expect(html).toContain('From the archive');
  expect(html).toContain('Supplied logo');
  expect(html).toContain('founders’ earlier projects');
  const adult=html.match(/<details\b[^>]*>[\s\S]*?TushindeBet[\s\S]*?<\/details>/)?.[0];
  expect(adult).toBeDefined();
  expect(adult).toContain('Adult commercial campaigns (18+)');
  expect(adult).not.toMatch(/^<details\b[^>]*\bopen(?:=|\s|>)/);
  expect(html.slice(0,html.indexOf('<details'))).not.toContain('TushindeBet');
  expect(html).not.toMatch(/Trusted by|endorsed by|600\+/i);
});
