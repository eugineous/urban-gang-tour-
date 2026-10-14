import type { Metadata } from 'next';
import ColorBlastShop from '@/app/_components/merch/ColorBlastShop';
export const metadata: Metadata = {
  title: 'Color Blast Lookbook | Urban Gang Tour',
  description: 'Explore the Color Blast collection designs and original artwork.',
  alternates: { canonical: '/shop/lookbook' },
};
export default function LookbookPage() { return <ColorBlastShop />; }
