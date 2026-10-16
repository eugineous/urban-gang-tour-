/** Only editable story fields enter private drafts. Never store session/record metadata. */
export type StoryDraftContent = {
  slug: string; headline: string; section: string; image: string; dek: string;
  body: string; date: string; published: boolean; submitForReview: boolean;
  expectedVersion: string | null;
};

export function storyDraftContent(input: unknown): StoryDraftContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('invalid_story');
  const source = input as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = source[key] ?? '';
    if (typeof value !== 'string' || value.length > max || value.includes('\0')) throw Error('invalid_' + key);
    return value;
  };
  const slug = text('slug', 70);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('invalid_slug');
  const rawBody = Array.isArray(source.body) ? source.body : null;
  if (rawBody && (rawBody.length > 2000 || rawBody.some(p => typeof p !== 'string'))) throw Error('invalid_body');
  const body = rawBody ? rawBody.join('\n\n') : text('body', 100000);
  if (body.length > 100000 || body.includes('\0')) throw Error('invalid_body');
  const date = text('date', 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date)) throw Error('invalid_date');
  const image = text('image', 1000);
  if (image && !(image.startsWith('/') && !image.startsWith('//')) && !/^https:\/\/[^\s\\]+$/.test(image)) throw Error('invalid_image');
  const expectedVersion = source.expectedVersion ?? null;
  if (expectedVersion !== null && (typeof expectedVersion !== 'string' || expectedVersion.length > 50 || !/^\d{4}-\d{2}-\d{2}[ T]/.test(expectedVersion))) throw Error('invalid_version');
  for (const key of ['published', 'submitForReview']) if (source[key] !== undefined && typeof source[key] !== 'boolean') throw Error('invalid_' + key);
  return {slug, headline: text('headline', 500), section: text('section', 100), image, dek: text('dek', 2000), body, date,
    published: source.published === true, submitForReview: source.submitForReview === true, expectedVersion};
}

export const isDraftId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id);

export function exactKeys(input: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(input).every(key => keys.includes(key));
}
