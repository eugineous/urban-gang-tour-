import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

const PATH = '/';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return (
    <>
      {/* hero video starts buffering with the page, before the app boots */}
      <link rel="preload" as="video" href="/assets/video/hero-main.mp4" type="video/mp4" />
      <JsonLd data={structuredDataForPath(PATH)} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
