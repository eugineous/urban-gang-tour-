import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {publicationDate} from '@/lib/shared/publication-date';
import {PublicationDate} from '@/ui/components/PublicationDate';
import Site from '@/ui/components/Site';

describe('public publication dates',()=>{
  it('formats timestamp labels in Nairobi rather than the visitor timezone',()=>{
    expect(publicationDate('2026-10-22T22:30:00.000Z')).toEqual({dateTime:'2026-10-22T22:30:00.000Z',label:'23 Oct 2026'});
    expect(publicationDate('2026-10-23T01:30:00+03:00')?.label).toBe('23 Oct 2026');
  });
  it('preserves date-only records and valid leap days',()=>{
    expect(publicationDate('2026-10-23')).toEqual({dateTime:'2026-10-23',label:'23 Oct 2026'});
    expect(publicationDate('2028-02-29')?.label).toBe('29 Feb 2028');
  });
  it.each([undefined,null,0,'','not a date','2026-02-30','2026-02-29','2026-13-01','2026-10-23T04:04:00','2026-10-23T99:99:00Z'])('does not fabricate a date for %s',value=>{
    expect(publicationDate(value)).toBeNull();
  });
  it('keeps the exact source timestamp in the semantic time element',()=>{
    expect(renderToStaticMarkup(createElement(PublicationDate,{value:'2026-10-23T04:04:00.000Z'}))).toBe('<time dateTime="2026-10-23T04:04:00.000Z">23 Oct 2026</time>');
    expect(renderToStaticMarkup(createElement(PublicationDate,{value:'invalid'}))).toBe('<span>Date unavailable</span>');
  });
  it.each(['/','/blog','/blog/real-story'])('uses the same readable date without altering authored copy on %s',path=>{
    const source='2026-10-23T04:04:00.000Z';
    const html=renderToStaticMarkup(createElement(Site,{path,query:{},screens:[],products:[],events:[],posts:[{id:'real-story',headline:'Original title',dek:'Original introduction',body:'Original article body.',section:'Updates',date:source,img:'/owned-photo.jpg'}],initialNow:Date.parse(source)}));
    expect(html).toContain('<time dateTime="'+source+'">23 Oct 2026</time>');
    expect(html).not.toContain('· '+source);expect(html).toContain('Original title');
    if(path.endsWith('/real-story')){expect(html).toContain('Original article body.');expect(html).toContain('Original introduction');expect(html).toContain('Share this story');}
  });
});
