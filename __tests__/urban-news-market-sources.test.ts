import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import snapshot from '../data/urban-news-kenya-chart.json';
import {readPublisherHeadlines,discoverMarketSources,fetchKenyaChartBackup,marketChartUrl} from '../lib/server/urban-news-market-sources';

const updated='2026-11-23T12:00:00Z';
function rss(itemBody:string){
  return new Response('<rss><channel>'+itemBody+'</channel></rss>',{headers:{'content-type':'application/rss+xml'}});
}
function item(title:string,url:string,extra=''){
  return '<item><title>'+title+'</title><link>'+url+'</link><pubDate>'+updated+'</pubDate>'+extra+'</item>';
}
function chart(country:string){
  const results=['wrong','22','33'].map(id=>({artistName:'Act',name:'Track '+id,id,kind:'songs',url:'https://music.apple.com/'+country.toLowerCase()+'/album/release/1?i='+id}));
  return {feed:{id:marketChartUrl(country),country:country.toLowerCase(),updated,results}};
}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-23T22:10:00Z'));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps publisher metadata, skips sensitive titles and foreign links, deduplicates, then adds actual chart positions',async()=>{
  const url='https://www.tnx.africa/entertainment/music';
  const article=item('A festival &amp; music lineup',url+'?utm_source=rss','<description><![CDATA[<item><title>fake body item</title></item>]]></description>');
  const fetcher=vi.fn(async(input:string)=>input.includes('apple.com')?Response.json(chart('KE')):rss(article+article+item('Singer arrested',url+'/a')+item('Foreign article','https://elsewhere.example/music')));
  vi.stubGlobal('fetch',fetcher);
  const rows=await discoverMarketSources('KE',3);
  expect(rows.map(r=>[r.provider,r.title])).toEqual([['publisher_feed','A festival & music lineup'],['market_chart','Act’s “Track 22” ranks No. 2 on Apple Music’s Kenya songs chart'],['market_chart','Act’s “Track 33” ranks No. 3 on Apple Music’s Kenya songs chart']]);
  expect(rows[0]).toMatchObject({url,country:'KE',publisher:'The Standard Entertainment',observedAt:new Date().toISOString()});
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(fetcher.mock.calls.every(call=>!(call[0] as string).includes('tnx.africa'))).toBe(true);
});
it('checks GDELT publisher country, topic, freshness and sensitive titles when local feeds fail',async()=>{
  const base={sourcecountry:'Somalia',title:'New music festival in Mogadishu',seendate:'20261123T060000Z',url:'https://example.org/music',language:'English'};
  const fetcher=vi.fn(async(input:string)=>input.includes('gdeltproject')?Response.json({articles:[base,{...base,sourcecountry:'Canada'},{...base,title:'Election campaign features singer'},{...base,seendate:'20261101T060000Z'}]}):new Response('',{status:503}));
  vi.stubGlobal('fetch',fetcher);
  expect(await discoverMarketSources('SO',20)).toEqual([{country:'SO',language:'English',observedAt:'2026-11-23T06:00:00.000Z',provider:'gdelt',publisher:'example.org',title:base.title,url:base.url}]);
  expect(fetcher.mock.calls).toHaveLength(4);
  expect(new URL(fetcher.mock.calls.find(([url])=>url.includes('gdeltproject'))![0]).searchParams.get('query')).toContain('sourcecountry:SO');
});
it('rejects invalid markets, oversize feeds and wrong chart storefronts',async()=>{
  const fetcher=vi.fn(async(input:string)=>input.includes('apple.com')?Response.json(chart('US')):new Response('junk',{headers:{'content-type':'application/rss+xml','content-length':'600000'}}));
  vi.stubGlobal('fetch',fetcher);
  expect(await discoverMarketSources('https://example.org',10)).toEqual([]);
  expect(await discoverMarketSources('UG',0)).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await discoverMarketSources('UG',10)).toEqual([]);
});
it('keeps first-party music videos as link-only publisher discoveries',async()=>{
  const feed={...chart('UG').feed,id:marketChartUrl('UG').replace('songs.json','music-videos.json'),results:[{artistName:'Artist',name:'Performance',id:'55',kind:'music-videos',url:'https://music.apple.com/ug/music-video/performance/55'}]};
  vi.stubGlobal('fetch',async(url:string)=>url.includes('music-videos.json')?Response.json({feed}):new Response('',{status:503}));
  expect(await discoverMarketSources('UG',3)).toMatchObject([{provider:'publisher_feed',country:'UG',url:feed.results[0].url,title:'Artist — Performance (music video)'}]);
});
it('rotates global chart storefronts and labels the returned market',async()=>{
  const requested:string[]=[];
  vi.stubGlobal('fetch',async(url:string)=>{
    if(!url.includes('apple.com'))return new Response('',{status:503});
    const market=new URL(url).pathname.split('/')[3].toUpperCase();
    requested.push(market);
    return Response.json(chart(market));
  });
  const day1=await discoverMarketSources('Global',1);
  vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
  const day2=await discoverMarketSources('Global',1);
  expect(day1[0].country).toBe(requested[0]);
  expect(day2[0].country).toBe(requested[1]);
  expect(requested[0]).not.toBe(requested[1]);
});
it('uses only the dated Kenya chart leader and expires the offline snapshot',async()=>{
  const asOf=Date.parse(snapshot.feed.updated);
  vi.setSystemTime(asOf+3600000);
  const lead=await fetchKenyaChartBackup();
  expect(lead).toMatchObject({url:snapshot.feed.results[0].url,publisher:'Apple Music',country:'KE',provider:'apple_chart',observedAt:new Date(asOf).toISOString()});
  vi.setSystemTime(asOf+48*3600000+1);
  await expect(fetchKenyaChartBackup()).rejects.toThrow('provider_output_invalid');
});
it('attributes a public YouTube upload only to its fixed channel',async()=>{
 const entry=(channel:string)=>'<entry><yt:channelId>'+channel+'</yt:channelId><yt:videoId>AbCdEfGhI12</yt:videoId><title>Music performance</title><published>'+updated+'</published></entry>';
 vi.stubGlobal('fetch',async(url:string)=>url.startsWith('https://www.youtube.com/feeds/')?new Response('<feed>'+entry('unrelated')+entry('UC4eYXhJI4-7wSWc8UNRwD4A')+'</feed>',{headers:{'content-type':'application/atom+xml'}}):new Response('',{status:503}));
 expect(await discoverMarketSources('US',5)).toMatchObject([{publisher:'NPR Music',url:'https://www.youtube.com/watch?v=AbCdEfGhI12',provider:'publisher_feed'}]);
});
it('builds automatic briefs only from fresh, exact Apple song rows with safe labels and original ranks',async()=>{
 const {fetchAutomaticChartRows}=await import('../lib/server/urban-news-market-sources');
 const base=chart('KE').feed,good=base.results[1];
 const rows=[{...good,name:'Allegations about singer'},{...good,url:good.url.replace('/album/release/1','/album/other/page/1')},{...good,url:good.url.replace('music.apple.com','music.apple.com.example.org')},good];
 let feed={...base,results:rows};
 const fetch=vi.fn(async()=>Response.json({feed}));
 vi.stubGlobal('fetch',fetch);
 expect(await fetchAutomaticChartRows('KE')).toMatchObject([{title:expect.stringContaining('ranks No. 4'),url:good.url}]);
 expect(fetch).toHaveBeenCalledWith(marketChartUrl('KE'),expect.objectContaining({redirect:'error',cache:'no-store'}));
 feed={...feed,updated:'2020-01-01T00:00:00Z'};
 expect(await fetchAutomaticChartRows('KE')).toEqual([]);
 feed={...base,id:marketChartUrl('UG'),results:rows};
 expect(await fetchAutomaticChartRows('KE')).toEqual([]);
});

it('keeps attributed press headlines current and scoped to the requested outlet',async()=>{
  vi.stubGlobal('fetch',async()=>rss(item('Music festival','https://notjustok.com/music/test')+item('Different outlet','https://example.com/music')));
  const stories=await readPublisherHeadlines('NG');
  expect(stories).toMatchObject([{publisher:'NotJustOk',publishedAt:'2026-11-23T12:00:00.000Z'}]);
  vi.setSystemTime(new Date('2026-11-27T13:00:00Z'));
  vi.stubGlobal('fetch',async()=>new Response('',{status:503}));
  expect(await readPublisherHeadlines('NG')).toEqual([]);
});
