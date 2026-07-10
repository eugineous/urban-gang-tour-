import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { breadcrumbFor, productsWithReviews } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { RenderedPage } from '@/app/_components/RenderedPage';

const PATH = '/shop';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default async function Page() {
  // products carry real moderated review aggregates when they exist
  const products = await productsWithReviews();
  return (
    <>
      <JsonLd data={[products, breadcrumbFor(PATH)]} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
