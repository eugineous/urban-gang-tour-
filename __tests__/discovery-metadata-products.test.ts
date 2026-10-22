import {beforeEach, expect, it, vi} from 'vitest';

const state = vi.hoisted(() => ({rows: [] as Record<string, unknown>[], q: vi.fn()}));
vi.mock('@/lib/server/db', () => ({hasDb: () => true, q: state.q}));
vi.mock('@/lib/server/ops', () => ({ensureOpsSchema: async () => {}}));
import {generateMetadata} from '@/app/shop/[id]/page';

beforeEach(() => {
  state.rows = [{id: 'real-product', name: 'An actual product', description: 'Original approved product.', price: 1500, image: '/media/product.jpg', variants: []}];
  state.q.mockReset().mockImplementation(async () => state.rows);
});

it('gives an approved product matching individual canonical, OG and Twitter cards', async () => {
  const metadata = await generateMetadata({params: Promise.resolve({id: 'real-product'})});
  expect(metadata.alternates?.canonical).toBe('https://urbangangtour.co.ke/shop/real-product');
  expect(metadata.openGraph).toMatchObject({url: 'https://urbangangtour.co.ke/shop/real-product', images: [{url: 'https://urbangangtour.co.ke/media/product.jpg', alt: 'An actual product'}]});
  expect(metadata.twitter).toMatchObject({card: 'summary_large_image', title: metadata.title, description: metadata.description, images: ['https://urbangangtour.co.ke/media/product.jpg']});
});

it('preserves external owned product artwork without double-prefixing the domain', async () => {
  state.rows[0].image = 'https://images.example.test/original.webp';
  const metadata = await generateMetadata({params: Promise.resolve({id: 'real-product'})});
  expect(metadata.openGraph).toMatchObject({images: [{url: 'https://images.example.test/original.webp'}]});
  expect(metadata.twitter).toMatchObject({images: ['https://images.example.test/original.webp']});
});

it('does not turn an unapproved design preview into a stock claim in a social card', async () => {
  state.rows = [];
  const metadata = await generateMetadata({params: Promise.resolve({id: 'cb-hoodie'})});
  expect(metadata.title).toContain('Design Preview');
  expect(metadata.description).toContain('stock unconfirmed');
  expect(metadata.twitter).toMatchObject({card: 'summary_large_image', title: metadata.title, description: metadata.description});
});
