export const LEGACY_MERCH_IMAGES = Object.freeze({
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
} as const);

type LegacyMerchRetirementTarget = {
  id: keyof typeof LEGACY_MERCH_IMAGES;
  expected_image: string;
  expected_name: string;
  expected_price: number;
};

export type LegacyMerchRetirementManifest = {
  version: 1;
  mode: 'owner_retire_legacy_merch';
  request_id: string;
  requested_at: string;
  expires_at: string;
  source_request: string;
  targets: LegacyMerchRetirementTarget[];
};

const SIX_HOURS = 6 * 60 * 60 * 1000;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function exactFields(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && keys.every(key => typeof key === 'string' && fields.includes(key));
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !value.includes('\u0000');
}

function canonicalUtc(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_INSTANT.test(value)) return false;
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) return false;
  const canonical = value.length === 20 ? value.slice(0, -1) + '.000Z' : value;
  return new Date(instant).toISOString() === canonical;
}

/** Strict private operator input. Parsing expired data permits immutable journal replay checks. */
export function legacyMerchRetirementManifest(
  raw: unknown,
  now = Date.now(),
): LegacyMerchRetirementManifest {
  if (
    !exactFields(raw, ['version', 'mode', 'request_id', 'requested_at', 'expires_at', 'source_request', 'targets']) ||
    raw.version !== 1 || raw.mode !== 'owner_retire_legacy_merch' ||
    !boundedText(raw.request_id, 36) || !UUID.test(raw.request_id) ||
    !canonicalUtc(raw.requested_at) || !canonicalUtc(raw.expires_at) ||
    !boundedText(raw.source_request, 1000) || !Array.isArray(raw.targets) ||
    raw.targets.length < 1 || raw.targets.length > 14
  ) throw Error('invalid_legacy_merch_retirement_manifest');

  const start = Date.parse(raw.requested_at);
  const end = Date.parse(raw.expires_at);
  if (!Number.isFinite(now) || start > now || end <= start || end - start > SIX_HOURS) {
    throw Error('invalid_legacy_merch_retirement_validity');
  }

  const seen = new Set<string>();
  const targets = Array.from(raw.targets, (target: unknown): LegacyMerchRetirementTarget => {
    if (
      !exactFields(target, ['id', 'expected_image', 'expected_name', 'expected_price']) ||
      typeof target.id !== 'string' || !Object.prototype.hasOwnProperty.call(LEGACY_MERCH_IMAGES, target.id) ||
      seen.has(target.id) || target.expected_image !== LEGACY_MERCH_IMAGES[target.id as keyof typeof LEGACY_MERCH_IMAGES] ||
      !boundedText(target.expected_name, 200) || typeof target.expected_price !== 'number' ||
      !Number.isSafeInteger(target.expected_price) || target.expected_price < 0
    ) throw Error('invalid_legacy_merch_retirement_target');
    seen.add(target.id);
    return {
      id: target.id as keyof typeof LEGACY_MERCH_IMAGES,
      expected_image: target.expected_image as string,
      expected_name: target.expected_name,
      expected_price: target.expected_price,
    };
  });

  return {
    version: 1,
    mode: 'owner_retire_legacy_merch',
    request_id: raw.request_id,
    requested_at: raw.requested_at,
    expires_at: raw.expires_at,
    source_request: raw.source_request,
    targets,
  };
}
