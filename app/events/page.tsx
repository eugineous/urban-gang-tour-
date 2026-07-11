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

// Events JSON-LD is rebuilt from the DB (tour_events) on every render instead
// of the static structuredDataForPath('/events') block, so Google always sees
// the current admin-edited events/prices — see jsonld.ts eventsFromDb() for
// the DB-error fallback to the frozen static snapshot.
export default async function Page() {
  const events = await eventsFromDb();
  return (
    <>
      <JsonLd data={[events, breadcrumbFor(PATH)]} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
