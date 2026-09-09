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
      {/* No <link rel="preload" as="video"> here any more. It forced the whole
          hero file down alongside the critical resources regardless of the
          element's own preload setting, which both defeated preload="none" and
          overrode the save-data / 2g skip in app/_components/FastImages.tsx -
          the visitors who could least afford it were the ones it hurt. The
          video is faststart-encoded and 776KB, so letting the element fetch it
          when it is ready is fast enough and costs nothing to anyone who never
          sees it. */}
      <JsonLd data={structuredDataForPath(PATH)} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
