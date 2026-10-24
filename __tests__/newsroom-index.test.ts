import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import Site from '@/ui/components/Site';

const story = (id:string, date:string) => ({id, date, headline:`Story ${id}`, section:'Updates', dek:`Introduction ${id}`, img:'/owned-photo.jpg'});
function render(posts:ReturnType<typeof story>[], newsCurrent=true) {
  return renderToStaticMarkup(createElement(Site, {
    path:'/blog', query:{}, screens:[], products:[], events:[], posts, newsCurrent,
  } as Parameters<typeof Site>[0]));
}

describe('published newsroom index', () => {
  it('orders exact publication instants before older date-only Nairobi records', () => {
    const html=render([
      story('date-only','2026-10-24'),
      story('offset','2026-10-24T03:00:00+03:00'),
      story('newest','2026-10-24T01:00:00Z'),
      story('previous-utc-day','2026-10-23T22:30:00Z'),
    ]);
    const positions=['newest','offset','previous-utc-day','date-only'].map(id=>html.indexOf(`href="/blog/${id}"`));
    expect(positions.every(position=>position>=0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a,b)=>a-b));
    expect(html).toContain('Newest first');
  });

  it('breaks publication ties by canonical slug and keeps malformed dates last', () => {
    const html=render([story('z-story','2026-10-24'),story('undated','invalid'),story('a-story','2026-10-24')]);
    expect(html.indexOf('href="/blog/a-story"')).toBeLessThan(html.indexOf('href="/blog/z-story"'));
    expect(html.indexOf('href="/blog/z-story"')).toBeLessThan(html.indexOf('href="/blog/undated"'));
    expect(html).toContain('Date unavailable');
  });

  it('distinguishes an empty published feed from a search with no matches', () => {
    const html=render([]);
    expect(html).toContain('No published stories yet.');
    expect(html).not.toContain('No matching stories');
    expect(html).not.toContain('Clear search');
    expect(html).toContain('href="/events"');
  });

  it('fails closed with an honest retry state when the public feed is unavailable', () => {
    const html=render([story('last-loaded','2026-10-24')],false);
    expect(html).toContain('Stories are temporarily unavailable.');
    expect(html).toContain('href="/blog"');
    expect(html).not.toContain('href="/blog/last-loaded"');
    expect(html).not.toContain('No published stories yet.');
  });

  it('keeps authored headlines and introductions, semantic dates, topic controls and story counts', () => {
    const html=render([story('real-story','2026-10-23T22:30:00Z')]);
    expect(html).toContain('Story real-story');
    expect(html).toContain('Introduction real-story');
    expect(html).toContain('<time dateTime="2026-10-23T22:30:00Z">24 Oct 2026</time>');
    expect(html).toContain('aria-label="News categories"');
    expect(html).toContain('Schools &amp; campuses');
    expect(html).toContain('Search stories');
    expect(html).toContain('1 of 1 stories');
    expect((html.match(/<h1(?:\s|>)/g)||[])).toHaveLength(1);
  });

  it('keeps older published stories reachable through progressive loading', () => {
    const html=render(Array.from({length:15},(_,i)=>story(`story-${String(i).padStart(2,'0')}`,'2026-10-24')));
    expect(html).toContain('12 of 15 stories');
    expect(html).toContain('Show more stories');
    expect(html).toContain('href="/blog/story-00"');
  });
});
