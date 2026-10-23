const formatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
});

/** Stable public label, independent of the visitor's device timezone. */
export function publicationDate(value: unknown): {dateTime: string; label: string} | null {
  if (typeof value !== 'string') return null;
  const source = value.trim();
  // A timezone is required for timestamps; never interpret one in the browser's
  // local timezone. Date-only editorial records retain their calendar date.
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(source)) return null;
  const dateOnly = source.length === 10;
  const calendar = new Date(source.slice(0, 10) + 'T12:00:00Z');
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== source.slice(0, 10)) return null;
  const date = dateOnly ? calendar : new Date(source);
  if (!Number.isFinite(date.getTime())) return null;
  return {dateTime: source, label: formatter.format(date)};
}
