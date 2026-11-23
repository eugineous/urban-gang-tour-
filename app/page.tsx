import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';
import {getBlogPostSummaries} from '@/app/_lib/blog';
import {readPublicEvents} from '@/lib/server/public-events';
import {readPublicProducts} from '@/lib/server/public-products';
import {UrbanNewsHome} from '@/app/_components/UrbanNews';
import {requestTime} from '@/lib/server/request-time';

const PATH = '/';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if(await urbanNewsEnabled())return {title:'Urban News + Urban Gang Tour — News, Events & Merchandise',description:'Entertainment and culture reporting, upcoming Urban Gang Tour events and merchandise.',alternates:{canonical:'/'}};
  return metadataForPathDynamic(PATH);
}

export default async function Page() {
  if(await urbanNewsEnabled()){
    const [news,events,products]=await Promise.allSettled([getBlogPostSummaries(true),readPublicEvents(),readPublicProducts()]);
    return <UrbanNewsHome posts={news.status==='fulfilled'?news.value.slice(0,200):[]} newsCurrent={news.status==='fulfilled'} events={events.status==='fulfilled'?events.value:[]} eventsCurrent={events.status==='fulfilled'} products={products.status==='fulfilled'?products.value:[]} productsCurrent={products.status==='fulfilled'} now={requestTime()}/>;
  }
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
