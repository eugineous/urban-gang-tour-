import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { eventsFromDb, breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

const PATH = '/events';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

// Events JSON-LD is rebuilt from the database on every render instead of the
// static snapshot. It is omitted when the live database is unavailable or has
// no current published ticketed events, rather than advertising stale events.
export default async function Page() {
  const events = await eventsFromDb();
  return (
    <>
      <JsonLd data={[events, breadcrumbFor(PATH)].filter(Boolean)} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
