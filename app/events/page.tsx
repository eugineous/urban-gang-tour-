import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { eventsFromDb, breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { redirect } from 'next/navigation';
import { RenderedPage } from '@/app/_components/RenderedPage';

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic('/events');
}
export default async function EventsPage({searchParams}:{searchParams:Promise<{event?:string}>}) {
  const query=await searchParams;
  if(query.event)redirect('/checkout?event='+encodeURIComponent(query.event));
  const events = await eventsFromDb();
  return <>
    <JsonLd data={[events, breadcrumbFor('/events')].filter(Boolean)} />
    <RenderedPage pathName="/events" />
  </>;
}
