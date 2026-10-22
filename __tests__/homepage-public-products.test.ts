import {beforeEach, expect, it, vi} from 'vitest';

const state = vi.hoisted(() => ({products: vi.fn()}));
vi.mock('@/ui/components/HostedSite', () => ({default: () => null}));
vi.mock('@/app/_components/LiveCommerce', () => ({LiveCommerce: () => null}));
vi.mock('@/app/_components/BookingForm', () => ({BookingForm: () => null}));
vi.mock('@/app/_lib/blog', () => ({getBlogPosts: async () => []}));
vi.mock('@/lib/server/public-events', () => ({readPublicEvents: async () => []}));
vi.mock('@/lib/server/public-products', () => ({readPublicProducts: state.products}));
vi.mock('@/lib/server/website-content', () => ({readWebsiteContent: async () => null}));
vi.mock('@/lib/server/request-time', () => ({requestTime: () => 1_792_656_000_000}));

import {RenderedPage} from '@/app/_components/RenderedPage';

beforeEach(() => {vi.resetAllMocks(); state.products.mockResolvedValue([]);});

it('server-seeds the homepage with real public merchandise before hydration', async () => {
  const products = [{id: 'tee', name: 'Original Tee', price: 1500, variants: []}];
  state.products.mockResolvedValue(products);
  const page = await RenderedPage({pathName: '/'});
  expect(page.props.products).toEqual(products);
  expect(state.products).toHaveBeenCalledOnce();
});

it('does not add merchandise queries to unrelated public pages', async () => {
  const page = await RenderedPage({pathName: '/about'});
  expect(page.props.products).toEqual([]);
  expect(state.products).not.toHaveBeenCalled();
});

it('keeps the homepage available without fabricating products during a catalogue outage', async () => {
  state.products.mockRejectedValue(new Error('catalog_unavailable'));
  const page = await RenderedPage({pathName: '/'});
  expect(page.props.products).toEqual([]);
  expect(page.props.path).toBe('/');
});
