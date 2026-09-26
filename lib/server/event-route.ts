// Canonical event-path resolution kept deliberately separate from middleware.
// Middleware runs before the App Router and is a poor home for database-backed
// public-record decisions. The page resolves an old id only after applying the
// same public-visibility gate as the canonical slug lookup.

export type EventRouteRow = { id: string; slug: string };

export type EventRouteMatch<T extends EventRouteRow> =
  | { kind: 'canonical'; event: T }
  | { kind: 'redirect'; event: T }
  | { kind: 'not_found' };

export function isSafeEventPathSegment(value: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(value);
}

/**
 * Prefer an exact slug match over an id match. This matters when an old id
 * happens to look like a slug: a canonical URL must never redirect to itself.
 */
export function matchEventRoute<T extends EventRouteRow>(
  pathSegment: string,
  bySlug: T | null | undefined,
  byLegacyId: T | null | undefined,
): EventRouteMatch<T> {
  if (!isSafeEventPathSegment(pathSegment)) return { kind: 'not_found' };
  if (bySlug?.slug === pathSegment) return { kind: 'canonical', event: bySlug };
  if (byLegacyId?.slug) return { kind: 'redirect', event: byLegacyId };
  return { kind: 'not_found' };
}
