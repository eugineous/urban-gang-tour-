import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_MERCH_IMAGES, legacyMerchRetirementManifest } from '@/lib/legacy-merch-retirement';

const NOW = Date.parse('2026-10-25T12:00:00.000Z');
const SIX_HOURS = 6 * 60 * 60 * 1000;
const images = {
  p1: '/assets/merch/magenta-tee.png',
  p2: '/assets/merch/crewneck.png',
  p3: '/assets/merch/snapback.png',
  p4: '/assets/merch/bucket-hat.png',
  p5: '/assets/merch/tote.png',
  p6: '/assets/merch/beanie.png',
  p7: '/assets/merch/bottle.png',
  p8: '/assets/merch/wristbands.png',
  p9: '/assets/merch/gym-sack.png',
  p10: '/assets/merch/baby-tee.png',
  p11: '/assets/merch/jersey.png',
  p12: '/assets/merch/waist-bag.png',
  p13: '/assets/merch/lanyard.png',
  p14: '/assets/merch/stickers.png',
};
const target = () => ({
  id: 'p1',
  expected_image: images.p1,
  expected_name: 'Original magenta tee',
  expected_price: 1500,
});
const sample = () => ({
  version: 1,
  mode: 'owner_retire_legacy_merch',
  request_id: '12345678-1234-1234-1234-123456789abc',
  requested_at: '2026-10-25T12:00:00.000Z',
  expires_at: '2026-10-25T18:00:00.000Z',
  source_request: 'Owner explicitly approved retiring the legacy merchandise.',
  targets: [target()],
});

afterEach(() => vi.restoreAllMocks());

describe('legacy merchandise retirement manifest', () => {
  it('accepts the exact manifest and exposes the fixed frozen legacy image map', () => {
    expect(legacyMerchRetirementManifest(sample(), NOW)).toEqual(sample());
    expect(LEGACY_MERCH_IMAGES).toEqual(images);
    expect(Object.isFrozen(LEGACY_MERCH_IMAGES)).toBe(true);
  });

  it('accepts all fourteen unique exact legacy products', () => {
    const manifest = {
      ...sample(),
      targets: Object.entries(images).map(([id, expected_image]) => ({
        ...target(), id, expected_image,
      })),
    };
    expect(legacyMerchRetirementManifest(manifest, NOW)).toEqual(manifest);
  });

  it('preserves exact expected values and returns independent manifest records', () => {
    const manifest = sample();
    manifest.targets[0].expected_name = '  Owner-authored product name  ';
    const result = legacyMerchRetirementManifest(manifest, NOW);
    expect(result).toEqual(manifest);
    expect(result).not.toBe(manifest);
    expect(result.targets).not.toBe(manifest.targets);
    expect(result.targets[0]).not.toBe(manifest.targets[0]);
  });

  it('uses Date.now by default and accepts second precision UTC', () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const manifest = {
      ...sample(), requested_at: '2026-10-25T12:00:00Z', expires_at: '2026-10-25T18:00:00Z',
    };
    expect(legacyMerchRetirementManifest(manifest)).toEqual(manifest);
  });

  it('accepts an expired approval for journal replay checks without extending it', () => {
    const manifest = {
      ...sample(), requested_at: '2026-10-24T12:00:00Z', expires_at: '2026-10-24T13:00:00Z',
    };
    expect(legacyMerchRetirementManifest(manifest, NOW)).toEqual(manifest);
  });

  it('accepts exact string and nonnegative safe-integer bounds', () => {
    for (const expected_price of [0, Number.MAX_SAFE_INTEGER]) {
      const manifest = {
        ...sample(), source_request: 's'.repeat(1000),
        targets: [{ ...target(), expected_name: 'n'.repeat(200), expected_price }],
      };
      expect(legacyMerchRetirementManifest(manifest, NOW)).toEqual(manifest);
    }
  });

  it.each([null, undefined, false, 1, 'manifest', [], new Date()])(
    'rejects non-manifest input %#', (raw) => {
      expect(() => legacyMerchRetirementManifest(raw, NOW)).toThrow('invalid_legacy_merch_retirement_manifest');
    },
  );

  it.each([
    { version: 2 }, { version: '1' }, { mode: 'retire_all' },
    { request_id: 'not-a-uuid' }, { request_id: '12345678-1234-1234-1234-123456789ABC' },
    { request_id: ' 12345678-1234-1234-1234-123456789abc' },
    { source_request: '' }, { source_request: ' \n ' }, { source_request: 12 },
    { source_request: 's'.repeat(1001) }, { source_request: 'request\u0000suffix' },
    { phase: 'apply' }, { approved: true }, { action: 'delete' },
    { targets: null }, { targets: {} }, { targets: [] },
    { targets: Array.from({ length: 15 }, target) }, { targets: [target(), target()] },
    { targets: Array(1) },
  ])('rejects invalid top-level fields %#', (change) => {
    expect(() => legacyMerchRetirementManifest({ ...sample(), ...change }, NOW)).toThrow();
  });

  it.each(Object.keys(sample()))('requires own field %s', (field) => {
    const manifest: Record<string, unknown> = sample();
    delete manifest[field];
    expect(() => legacyMerchRetirementManifest(manifest, NOW)).toThrow();
  });

  it('rejects inherited required fields and unknown non-enumerable or symbol fields', () => {
    expect(() => legacyMerchRetirementManifest(Object.create(sample()), NOW)).toThrow();
    const hidden = Object.defineProperty(sample(), 'apply', { value: true });
    expect(() => legacyMerchRetirementManifest(hidden, NOW)).toThrow();
    expect(() => legacyMerchRetirementManifest({ ...sample(), [Symbol('apply')]: true }, NOW)).toThrow();
  });

  it.each([
    { id: 'p0' }, { id: 'p15' }, { id: 'P1' }, { id: 'p1 ' }, { id: 'constructor' },
    { id: 'toString' }, { id: '__proto__' }, { id: 1 },
    { expected_image: images.p2 }, { expected_image: '/assets/merch/../merch/magenta-tee.png' },
    { expected_image: 'https://urbangangtour.co.ke' + images.p1 },
    { expected_image: images.p1 + '?version=1' }, { expected_image: null },
    { expected_name: '' }, { expected_name: '\t\n' }, { expected_name: 12 },
    { expected_name: 'n'.repeat(201) }, { expected_name: 'name\u0000suffix' },
    { expected_price: -1 }, { expected_price: 0.5 }, { expected_price: '1500' },
    { expected_price: NaN }, { expected_price: Infinity },
    { expected_price: Number.MAX_SAFE_INTEGER + 1 },
    { status: 'retired' }, { name: 'replacement' }, { stock: 0 },
  ])('rejects invalid target fields %#', (change) => {
    expect(() => legacyMerchRetirementManifest({
      ...sample(), targets: [{ ...target(), ...change }],
    }, NOW)).toThrow('invalid_legacy_merch_retirement_target');
  });

  it.each([null, undefined, false, 1, 'p1', []])('rejects non-record target %#', (raw) => {
    expect(() => legacyMerchRetirementManifest({ ...sample(), targets: [raw] }, NOW)).toThrow();
  });

  it.each(Object.keys(target()))('requires target field %s', (field) => {
    const record: Record<string, unknown> = target();
    delete record[field];
    expect(() => legacyMerchRetirementManifest({ ...sample(), targets: [record] }, NOW)).toThrow();
  });

  it('rejects inherited and hidden target fields', () => {
    for (const record of [
      Object.create(target()),
      Object.defineProperty(target(), 'status', { value: 'retired' }),
      { ...target(), [Symbol('status')]: 'retired' },
    ]) {
      expect(() => legacyMerchRetirementManifest({ ...sample(), targets: [record] }, NOW)).toThrow();
    }
  });

  it.each([
    'invalid', '2026-10-25', '2026-10-25T12:00:00+00:00', '2026-10-25T12:00:00z',
    '2026-10-25T12:00:00.1Z', '2026-10-25T12:00:00.0000Z',
    '2026-02-30T12:00:00Z', '2026-10-25T24:00:00Z', '2026-10-25T12:60:00Z',
    '2026-13-01T12:00:00Z', '2026-10-25T12:00:60Z', null, 0,
  ])('rejects noncanonical or impossible UTC timestamps %#', (value) => {
    for (const field of ['requested_at', 'expires_at']) {
      expect(() => legacyMerchRetirementManifest({ ...sample(), [field]: value }, NOW)).toThrow();
    }
  });

  it('rejects future requests, nonpositive windows and windows longer than six hours', () => {
    for (const change of [
      { requested_at: new Date(NOW + 1).toISOString() },
      { expires_at: new Date(NOW).toISOString() },
      { expires_at: new Date(NOW - 1).toISOString() },
      { expires_at: new Date(NOW + SIX_HOURS + 1).toISOString() },
    ]) {
      expect(() => legacyMerchRetirementManifest({ ...sample(), ...change }, NOW)).toThrow(
        'invalid_legacy_merch_retirement_validity',
      );
    }
  });

  it.each([NaN, Infinity, -Infinity])('rejects an invalid validation clock %#', (now) => {
    expect(() => legacyMerchRetirementManifest(sample(), now)).toThrow();
  });
});
