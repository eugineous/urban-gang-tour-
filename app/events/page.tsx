import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { eventsFromDb, breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

// Availability is read from the existing event-truth API so a sale window or
// capacity change never leaves a stale offer on the public page.
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic('/events');
}

export default async function EventsPage() {
  const jsonLd = await eventsFromDb();
  return <>
    {jsonLd ? <JsonLd data={[jsonLd, breadcrumbFor('/events')].filter(Boolean)} /> : null}
    <RenderedPage pathName="/events" />
  </>;
}
