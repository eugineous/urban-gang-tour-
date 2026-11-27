import {afterEach,expect,it,vi} from 'vitest';
import seed from '../data/urban-news-local-briefs.json';
import {getPublisherBrief,getPublisherBriefs,parsePublisherBriefs,publisherBriefHref} from '../lib/server/urban-news-briefs';
import {invalidate} from '../lib/server/microcache';

const story=seed[2];
const [day,id]=publisherBriefHref(story as Parameters<typeof publisherBriefHref>[0]).split('/').slice(-2);
afterEach(()=>{
  vi.unstubAllGlobals();
  vi.useRealTimers();
  invalidate('urban-news:local-edition');
  invalidate('urban-news:edition:'+day);
});

it('keeps the rewritten headline, source credit and stable site URL only for a valid source identity',()=>{
  expect(parsePublisherBriefs([story,{...story,url:'https://publisher.example/fake'},{...story,id:'forged'}])).toEqual([story]);
  expect(story.headline).not.toBe(story.sourceHeadline);
  expect(publisherBriefHref(parsePublisherBriefs([story])[0])).toBe('/news/brief/'+day+'/'+id);
});

it('resolves an archived story when the latest headlines have moved on',async()=>{
  const fetch=vi.fn(async (url:string)=>Response.json(url.endsWith('latest-briefs.json')?[]:{day,stories:[story]}));
  vi.stubGlobal('fetch',fetch);
  expect(await getPublisherBrief(day,id)).toEqual(story);
  expect(fetch.mock.calls.every(([url])=>url.startsWith('https://raw.githubusercontent.com/eugineous/urban-gang-tour-/urban-news-feeds/'))).toBe(true);
  expect(await getPublisherBrief('../no',id)).toBeUndefined();
});

it('uses the same original publish date if the external snapshot is unavailable',async()=>{
  vi.stubGlobal('fetch',async()=>new Response(null,{status:503}));
  vi.useFakeTimers().setSystemTime(new Date(Date.parse(story.publishedAt)+60000));
  expect((await getPublisherBriefs()).find(item=>item.id===id)?.publishedAt).toBe(story.publishedAt);
  expect((await getPublisherBrief(day,id))?.url).toBe(story.url);
  vi.setSystemTime(new Date(Date.parse(story.publishedAt)+96*3600_000));
  expect((await getPublisherBriefs()).some(item=>item.id===id)).toBe(false);
});

it('keeps the original-media license and rejects ordinary image URLs without reuse terms',()=>{
  const sourcePhoto={source:'https://notjustok.com/image.jpg',license:'https://creativecommons.org/licenses/by/4.0',credit:'Staff Photographer',licenseLabel:'CC BY 4.0',alt:'The performer on stage'};
  expect(parsePublisherBriefs([{...story,sourcePhoto}])[0].sourcePhoto).toEqual(sourcePhoto);
  expect(parsePublisherBriefs([{...story,sourcePhoto:{...sourcePhoto,license:'https://example.com/terms'}}])[0].sourcePhoto).toBeUndefined();
  expect(parsePublisherBriefs([{...story,sourcePhoto:{...sourcePhoto,source:'https://unrelated.example/photos.jpg'}}])[0].sourcePhoto).toBeUndefined();
});
