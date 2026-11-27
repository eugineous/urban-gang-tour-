import {Suspense} from 'react';
import HomeNews from '@/app/_components/HomeNews';
import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

import {urbanNewsEnabled} from '@/lib/server/urban-news-mode';

const PATH = '/';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default async function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <RenderedPage pathName={PATH} homeNews={urbanNewsEnabled()?<Suspense fallback={null}><HomeNews/></Suspense>:undefined}/>
    </>
  );
}
