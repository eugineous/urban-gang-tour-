import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {PortfolioPage} from '@/ui/components/PortfolioReconstruction';
import {ShowcaseShelf, shelfScrollBehavior, shelfScrollTarget} from '@/ui/components/ShowcaseShelf';
import {asset, media} from '@/ui/components/MediaLibrary';
import {EMPTY_PARTNER} from '@/lib/partner-events';

const now=Date.parse('2026-10-22T12:00:00+03:00');
const record={id:'school',slug:'completed-school',kind:'school',name:'Completed school record',status:'completed',eventDate:'2026-09-01',venue:'School hall',image:'/uploads/completed-school.webp'};
const shelf=(html:string, id:string) => html.slice(html.indexOf('<section id="'+id+'"'),html.indexOf('</section>',html.indexOf('<section id="'+id+'"')));

describe('portfolio library shelves', () => {
  it('uses fixed implicit tracks so the shelf can overflow instead of compressing every card',()=>{
    const css=readFileSync('ui/components/ShowcaseShelf.module.css','utf8');
    expect(css).toContain('grid-auto-columns:84%');
    expect(css).not.toContain('grid-auto-columns:minmax(0,');
    expect(css).toContain('overflow-x:auto');
  });
  it('wraps a row in both directions, with clamped steps and fractional end tolerance', () => {
    const metrics={scrollLeft:0,scrollWidth:1400,clientWidth:400};
    const positions:number[]=[];
    for (let index=0;index<4;index++) {metrics.scrollLeft=shelfScrollTarget(metrics,1);positions.push(metrics.scrollLeft)}
    expect(positions).toEqual([340,680,1000,0]);
    expect(shelfScrollTarget(metrics,-1)).toBe(1000);
    expect(shelfScrollTarget({...metrics,scrollLeft:100},-1)).toBe(0);
    expect(shelfScrollTarget({...metrics,scrollLeft:999.5},1)).toBe(0);
    expect(shelfScrollTarget({...metrics,scrollLeft:-20},-1)).toBe(1000);
    expect(shelfScrollTarget({...metrics,scrollLeft:1200},1)).toBe(0);
    expect(shelfScrollTarget({scrollLeft:0,scrollWidth:400,clientWidth:400},1)).toBe(0);
  });

  it('uses immediate scrolling for reduced motion and for a wrap across the row', () => {
    expect(shelfScrollBehavior(false)).toBe('smooth');
    expect(shelfScrollBehavior(true)).toBe('instant');
    expect(shelfScrollBehavior(false,true)).toBe('instant');
  });

  it('renders each card and link once with a labelled keyboard-scrollable region', () => {
    const html=renderToStaticMarkup(createElement(ShowcaseShelf,{id:'test-work',label:'Archive',title:'Test work',description:'Published records',items:[{id:'first',title:'First record',href:'/events/first',label:'Completed',action:'View record'},{id:'second',title:'Second record',href:'/events/second',label:'Completed',action:'View record'}]}));
    expect(html.match(/<li>/g)).toHaveLength(2);
    for (const slug of ['first','second']) expect(html.match(new RegExp('href="/events/'+slug+'"','g'))).toHaveLength(1);
    expect(html).toContain('id="test-work-items"');
    expect(html).toContain('role="region" aria-labelledby="test-work-title" aria-describedby="test-work-instructions" tabindex="0"');
    expect(html.match(/aria-controls="test-work-items"/g)).toHaveLength(2);
    expect(html).toContain('Previous items in Test work');
    expect(html).toContain('Next items in Test work');
    expect(html).toContain('Home or End');
    expect(html).not.toContain('tabindex="-1"');
  });

  it('preserves one page heading, five section anchors and the existing archive destinations', () => {
    const html=renderToStaticMarkup(createElement(PortfolioPage,{events:[record],initialNow:now}));
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('<h1>Our work.</h1>');
    expect(html.match(/data-showcase-shelf="true"/g)).toHaveLength(5);
    for (const id of ['school-work','campus-work','campaign-work','live-work','media-work']) {
      expect(html).toContain('href="#'+id+'"');
      expect(html).toContain('<section id="'+id+'"');
    }
    for (const href of ['/events/completed-school','/gallery/machakos-campus','/gallery/uon-mr-miss-2022','/gallery/tibs-campus','/gallery/kips-campus-rave','/gallery/tecno-uon','/gallery/infinix-kicc','/gallery/nairobi-choirs','/gallery/urban-news','/work-with-us','/press']) expect(html).toContain('href="'+href+'"');
  });

  it('shows only explicitly completed school records and never substitutes reconnaissance collections', () => {
    const events=[record,{...record,id:'elapsed',slug:'elapsed',name:'Elapsed published school',status:'published'},{...record,id:'postponed',slug:'postponed',name:'Postponed school',status:'postponed'},{...record,id:'private',slug:'private',name:'Private school',status:'draft'},{...record,id:'invalid',slug:'../invalid',name:'Invalid school link'}];
    const html=renderToStaticMarkup(createElement(PortfolioPage,{events,initialNow:now}));
    const schools=shelf(html,'school-work');
    expect(schools).toContain('Completed school record');
    expect(schools).toContain('Completed school stop');
    expect(schools).toContain('src="/uploads/completed-school.webp"');
    for (const name of ['Elapsed published school','Postponed school','Private school','Invalid school link','Gathirimu','Mlolongo']) expect(schools).not.toContain(name);
    const empty=renderToStaticMarkup(createElement(PortfolioPage,{events:[],initialNow:now}));
    expect(shelf(empty,'school-work')).toContain('Completed school records will appear here when published.');
    expect(shelf(empty,'school-work')).not.toContain('<li>');
  });

  it('places completed ticketed, partner and past records in the live shelf without including elapsed or private records', () => {
    const events=[record,...['ticketed','partner','past'].map(kind => ({...record,id:kind,slug:'completed-'+kind,kind,name:'Completed '+kind,partnerDetails:{...EMPTY_PARTNER,role:'Live hosting',client:'Recorded client',institutions:['Recorded institution']}})),{...record,id:'elapsed',kind:'partner',slug:'elapsed-public',name:'Elapsed published partner',status:'published'},{...record,id:'draft',kind:'ticketed',slug:'private-public',name:'Private public event',status:'draft'},{...record,id:'postponed',kind:'ticketed',slug:'postponed-public',name:'Postponed public event',status:'postponed'}];
    const html=renderToStaticMarkup(createElement(PortfolioPage,{events,initialNow:now}));
    const live=shelf(html,'live-work');
    for (const kind of ['ticketed','partner','past']) expect(live).toContain('href="/events/completed-'+kind+'"');
    for (const credit of ['Live hosting','Recorded institution']) expect(live).toContain(credit);
    expect(live).toContain('<span lang="en">For <span lang="en-KE">Recorded client</span></span>');
    for (const name of ['Completed school record','Elapsed published partner','Private public event','Postponed public event']) expect(live).not.toContain(name);
  });

  it('uses owned photographs and safe film posters with original film links and no automatic video playback', () => {
    const html=renderToStaticMarkup(createElement(PortfolioPage,{initialNow:now}));
    const knownArtwork=new Set(media.map(item => item.kind==='video'?item.poster:item.src));
    const images=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]);
    expect(images.length).toBeGreaterThan(20);
    for (const image of images) expect(knownArtwork.has(image)).toBe(true);
    for (const id of ['M210','M213','M215']) {
      expect(html).toContain('href="'+asset(id).src+'"');
      expect(html).toContain('src="'+asset(id).poster+'"');
    }
    for (const film of media.filter(item => item.kind==='video' && item.adult)) expect(html).not.toContain('href="'+film.src+'"');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('autoplay');
  });

  it('rejects unsafe event artwork while retaining its public completed record', () => {
    const html=renderToStaticMarkup(createElement(PortfolioPage,{events:[{...record,image:'javascript:alert(1)'}],initialNow:now}));
    const schools=shelf(html,'school-work');
    expect(schools).toContain('Artwork unavailable');
    expect(schools).toContain('href="/events/completed-school"');
    expect(schools).not.toContain('<img');
    expect(schools).not.toContain('javascript:');
  });
});
