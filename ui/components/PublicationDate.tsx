import {publicationDate} from '@/lib/shared/publication-date';

export function PublicationDate({value}: {value: unknown}) {
  const date = publicationDate(value);
  return date ? <time dateTime={date.dateTime}>{date.label}</time> : <span>Date unavailable</span>;
}
