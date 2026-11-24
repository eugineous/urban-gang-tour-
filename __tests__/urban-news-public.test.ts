import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {newsArchive,newsArchiveQuery,newsArchiveHref} from '@/lib/shared/news-archive';
import {MobileAppNavigation} from '@/app/_components/MobileAppNavigation';
const options={newsMode:true};
describe('new public news journeys',()=>{
 it('filters every published item by new category, country and query before pagination',()=>{
  const query=newsArchiveQuery({category:'music',country:'KE',q:'studio',page:'2'},options);
  expect(query).toMatchObject({category:'music',country:'KE',page:2});
  const stories=Array.from({length:30},(_,i)=>({slug:'fixture-'+i,headline:'Fictional studio report '+i,section:'music',newsCountry:i<25?'KE':'UG',datePublished:'2026-11-17T12:00:00Z'}));
  const archive=newsArchive(stories,query,options);expect(archive.matches).toHaveLength(25);expect(archive.visible).toHaveLength(12);
  expect(newsArchiveHref(query)).toBe('/blog?q=studio&category=music&country=KE&page=2');
 });
 it('keeps unknown geography in the explicitly approved Global filter',()=>{const query=newsArchiveQuery({country:'Global'},options);expect(query.country).toBe('Global');expect(newsArchive([{slug:'fixture-global',headline:'Fictional global culture report',section:'culture',newsCountry:'Global',datePublished:'2026-11-17'}],query,options).visible).toHaveLength(1);});
 it('does not apply legacy slug classifications to new news',()=>{
  const query=newsArchiveQuery({category:'culture'},options);
  expect(newsArchive([{slug:'eugine-micah-profile',headline:'Fictional culture report',section:'music',datePublished:'2026-11-17'}],query,options).visible).toEqual([]);
 });
 it('puts news and events beside a central home with shop and contact',()=>{
  const html=renderToStaticMarkup(createElement(MobileAppNavigation,{path:'/blog/fixture',newsMode:true}));
  expect([...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(m=>m[1])).toEqual(['/blog','/events','/','/shop','/apply']);
  expect(html).toContain('href="/blog" aria-current="page"');
 });
});

import {UrbanNewsIndex,NewsSourcePanel,UrbanNewsHome} from '@/app/_components/UrbanNews';
import {newsMessages} from '@/ui/i18n/catalogues/news';
import {catalogueProblems} from '@/lib/i18n/messages';
it('keeps all six interface catalogues complete',()=>expect(catalogueProblems(newsMessages)).toEqual([]));
it('shows a truthful outage without invented news, dates or readership',()=>{
 const html=renderToStaticMarkup(createElement(UrbanNewsIndex,{posts:[],query:{q:'',category:'all',page:999},pageCount:1,current:false,countries:[]}));
 expect(html).toContain('Stories are temporarily unavailable.');expect(html).not.toContain('data-news-story');expect(html).not.toContain('rel="next"');expect(html).not.toContain('rel="prev"');expect(html).toContain('name="country"');
});
it('shows approved sources, correction, disclosure and actual timestamps',()=>{
 const html=renderToStaticMarkup(createElement(NewsSourcePanel,{sources:[{id:'fixture',url:'https://example.test/release',title:'Fictional studio release',publisher:'Fixture Studio',publishedAt:'2026-11-16T09:00:00Z'}],verification:'attributed',correction:'Corrected the fixture title.',disclosure:'AI assisted the draft; an editor reviewed this report.',published:'2026-11-17T12:00:00Z',modified:'2026-11-17T13:00:00Z'}));
 expect(html).toContain('href="https://example.test/release"');expect(html).toContain('Attributed');expect(html).toContain('independent confirmation may be limited');expect(html).toContain('Corrected the fixture title.');expect(html).toContain('AI assisted');expect(html).toContain('dateTime="2026-11-17T13:00:00Z"');
});
it('preserves founder and booking paths after the honest news/events/shop empty states',()=>{
 const html=renderToStaticMarkup(createElement(UrbanNewsHome,{posts:[],newsCurrent:true,events:[],eventsCurrent:false,products:[],productsCurrent:false,now:Date.parse('2026-11-17T12:00:00Z')}));
 expect(html).toContain('No stories published yet');expect(html).toContain('The catalogue is temporarily unavailable.');expect(html).toContain('/author/eugine-micah');expect(html).toContain('/author/lucy-ogunde');expect(html).toContain('href="/book"');
});

vi.mock('next/navigation',async importOriginal=>({...await importOriginal<typeof import('next/navigation')>(),useRouter:()=>({refresh:vi.fn()})}));
