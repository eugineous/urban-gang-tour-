import {publicationDate} from './publication-date';

type DatedStory = {id?:string; slug?:string; date?:unknown; datePublished?:unknown};

function publishedAt(story:DatedStory):number|null {
  const value=publicationDate(story.datePublished ?? story.date)?.dateTime;
  if (!value) return null;
  // Legacy date-only posts start on the editorial calendar day in Nairobi.
  // Timestamped releases retain their exact instant, including UTC offsets.
  return Date.parse(value.length===10 ? `${value}T00:00:00+03:00` : value);
}

/** Order an already-public feed without changing its publication eligibility. */
export function newestPublishedFirst<T extends DatedStory>(posts:readonly T[]):T[] {
  return [...posts].sort((a,b)=>{
    const first=publishedAt(a), second=publishedAt(b);
    if (first===null || second===null) {
      if (first!==second) return first===null ? 1 : -1;
    } else if (first!==second) return second-first;
    const firstSlug=String(a.slug ?? a.id ?? ''), secondSlug=String(b.slug ?? b.id ?? '');
    return firstSlug<secondSlug ? -1 : firstSlug>secondSlug ? 1 : 0;
  });
}
