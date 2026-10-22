import {beforeEach, describe, expect, it, vi} from 'vitest';

const state = vi.hoisted(() => ({hasDb: vi.fn(), q: vi.fn(), ensureOpsSchema: vi.fn()}));
vi.mock('@/lib/server/db', () => ({hasDb: state.hasDb, q: state.q}));
vi.mock('@/lib/server/ops', () => ({ensureOpsSchema: state.ensureOpsSchema}));

import {readPublicProducts, publicCatalogDatabaseErrorCode} from '@/lib/server/public-products';
import {invalidate} from '@/lib/server/microcache';

beforeEach(() => {
  invalidate('site-products');
  vi.resetAllMocks();
  state.hasDb.mockReturnValue(true);
  state.q.mockResolvedValue([]);
  state.ensureOpsSchema.mockResolvedValue(undefined);
});

describe('shared public merchandise source', () => {
  it('keeps the active-only query and whitelists the same public product and variant fields', async () => {
    state.q.mockResolvedValue([{
      id: 'original-tee', name: 'Original Tee', price: '1500', stock: '4',
      image: '/uploads/tee.webp', category: 'Apparel', description: 'Original artwork.',
      name_on_back_enabled: true, internal_cost: 'private', supplier_email: 'private',
      variants: [{label: 'M', priceAdjustment: '200', sku: 'TEE-M', stock: '-1', privateNote: 'private'}, {label: '', stock: 3}],
    }]);
    expect(await readPublicProducts()).toEqual([{
      id: 'original-tee', name: 'Original Tee', price: 1500, stock: 4,
      image: '/uploads/tee.webp', category: 'Apparel', description: 'Original artwork.',
      name_on_back_enabled: true,
      variants: [{label: 'M', priceAdjustment: 200, sku: 'TEE-M', stock: 0}],
    }]);
    const sql = state.q.mock.calls[0][0];
    expect(sql).toContain('WHERE p.active');
    expect(sql).toContain('v.active=true');
    expect(sql).toContain('ORDER BY p.id');
    expect(state.ensureOpsSchema).not.toHaveBeenCalled();
  });

  it('does not turn untracked inventory into an in-stock claim or infer personalization', async () => {
    state.q.mockResolvedValue([{id: 'cap', name: 'Cap', price: 800}]);
    expect(await readPublicProducts()).toEqual([{
      id: 'cap', name: 'Cap', price: 800, stock: null, image: '', category: '', description: '',
      name_on_back_enabled: false, variants: [],
    }]);
  });

  it('coalesces simultaneous server/API catalogue reads into one query and reuses the snapshot', async () => {
    let resolve!: (rows: unknown[]) => void;
    state.q.mockImplementation(() => new Promise<unknown[]>(finish => {resolve = finish;}));
    const first = readPublicProducts();
    const second = readPublicProducts();
    expect(state.q).toHaveBeenCalledOnce();
    resolve([]);
    expect(await first).toEqual([]);
    expect(await second).toEqual([]);
    await readPublicProducts();
    expect(state.q).toHaveBeenCalledOnce();
  });

  it('fails explicitly when the database is unavailable without creating a query or schema', async () => {
    state.hasDb.mockReturnValue(false);
    await expect(readPublicProducts()).rejects.toThrow('catalog_unavailable');
    expect(state.q).not.toHaveBeenCalled();
    expect(state.ensureOpsSchema).not.toHaveBeenCalled();
  });

  it.each(['42P01', '42703'])('retries genuinely missing catalogue schema (%s) once', async code => {
    state.q.mockRejectedValueOnce(Object.assign(new Error('private'), {code})).mockResolvedValueOnce([]);
    expect(await readPublicProducts()).toEqual([]);
    expect(state.ensureOpsSchema).toHaveBeenCalledOnce();
    expect(state.q).toHaveBeenCalledTimes(2);
  });

  it('propagates a first transient failure without a migration or a false empty catalogue', async () => {
    const error = Object.assign(new Error('private connection details'), {code: '08006'});
    state.q.mockRejectedValue(error);
    await expect(readPublicProducts()).rejects.toBe(error);
    expect(state.ensureOpsSchema).not.toHaveBeenCalled();
    expect(publicCatalogDatabaseErrorCode(error)).toBe('08006');
    expect(publicCatalogDatabaseErrorCode({code: 'password=private'})).toBeNull();
  });
});
