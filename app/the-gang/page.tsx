import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic('/the-gang');
}
export default function Page() {
  return <>
    <JsonLd data={structuredDataForPath('/the-gang')} />
    <RenderedPage pathName="/the-gang" />
  </>;
}
