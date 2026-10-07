import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';
import { GALLERY_ARCHIVE } from '@/lib/gallery-archive';
import { hasDb } from '@/lib/server/db';
import { SITE } from '@/lib/site';

const PATH = '/gallery';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return (
    <>
      <JsonLd data={[
        ...structuredDataForPath(PATH),
        ...(!hasDb() ? GALLERY_ARCHIVE.map(photo => ({
          '@context': 'https://schema.org', '@type': 'ImageObject',
          contentUrl: `${SITE.domain}${photo.url}`, name: photo.caption,
          description: photo.altText,
        })) : []),
      ]} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
