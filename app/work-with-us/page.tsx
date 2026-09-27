import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { structuredDataForPath } from '@/app/_lib/jsonld';
import { JsonLd } from '@/app/_components/JsonLd';
import { WorkWithUsPage } from '@/app/_components/WorkWithUsPage';

const PATH = '/work-with-us';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return (
    <>
      <JsonLd data={structuredDataForPath(PATH)} />
      <WorkWithUsPage />
    </>
  );
}
