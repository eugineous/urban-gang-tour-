import type { Metadata } from 'next';
import { metadataForPath } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { getBlogPosts } from '@/app/_lib/blog';
import { getUpcomingStops, getTrendingAndMostRead } from '@/app/_lib/news-data';
import { getIgWall } from '@/lib/server/social-wall';
import { InstagramWall } from '@/app/_components/InstagramWall';
import { FeedAd } from '@/app/_components/Ads';
import { NewsClient, type Desk, type Story } from './NewsClient';

const PATH = '/blog';
export const metadata: Metadata = metadataForPath(PATH);

export const revalidate = 300;

// Real posts use two section-naming generations (pre- and post- 2026-07-21
// content push) - map both onto the redesign's desks so nothing silently
// disappears from every filtered view. Unrecognised sections fall back to
// 'culture' rather than vanishing.
function deskFor(section: string): Desk {
  const s = section.toLowerCase();
  if (s === 'events' || s === 'tour recap' || s === 'upcoming') return 'fresh';
  if (s === 'the gang' || s === 'partnerships') return 'gang';
  if (s === 'for institutions') return 'institutions';
  return 'culture';
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export default async function BlogIndex() {
  const posts = await getBlogPosts();
  const [routeRows, { trending, mostRead }, igWall] = await Promise.all([
    getUpcomingStops(),
    getTrendingAndMostRead(posts),
    getIgWall(),
  ]);

  const stories: Story[] = posts.map((p) => ({
    slug: p.slug,
    title: p.headline,
    dek: p.description,
    image: p.image,
    date: formatDate(p.datePublished),
    desk: deskFor(p.section),
  }));

  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <NewsClient
        hero={stories[0] ?? null}
        stories={stories.slice(1)}
        routeRows={routeRows}
        trending={trending}
        mostRead={mostRead}
      />
      <div style={{ background: '#1A0E14', padding: '0 24px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <FeedAd />
          {igWall.length > 0 && <InstagramWall urls={igWall} />}
        </div>
      </div>
    </>
  );
}
