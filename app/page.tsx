import type { Metadata } from 'next';
import { metadataForPathDynamic } from '@/app/_lib/seo';
import { HomePage } from '@/app/_components/HomePage';

const PATH = '/';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  return <HomePage />;
}
