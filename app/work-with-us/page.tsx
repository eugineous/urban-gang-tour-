import type { Metadata } from 'next';
import { metadataForPath } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

const PATH = '/work-with-us';

export const metadata: Metadata = metadataForPath(PATH);

export default function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
