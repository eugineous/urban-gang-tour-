import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { breadcrumbFor } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { LiveCommerce } from '@/app/_components/LiveCommerce';

const PATH = '/shop';

// The catalogue and its active product set are owner-managed in the database.
// Rendering at the edge prevents a build-time environment from freezing an
// empty or stale list into the public page.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default async function Page() {
  return (
    <>
      <JsonLd data={breadcrumbFor(PATH)} />
      <LiveCommerce />
    </>
  );
}
