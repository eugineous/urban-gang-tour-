/** Single-author editorial policy and reusable presentation helpers. */
export const URBAN_NEWS_AUTHOR = 'Eugine Micah' as const;
export const URBAN_NEWS_AUTHOR_URL = '/author/eugine-micah' as const;

export function readingMinutes(paragraphs: readonly string[]): number {
  const words = paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function fallbackDeck(description: unknown, paragraphs: readonly string[]): string {
  const existing = typeof description === 'string' ? description.trim() : '';
  if (existing) return existing;
  const lead = paragraphs.find(line => line.trim() && !/^#{1,6}\s/.test(line.trim())) || '';
  const plain = lead.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]+/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= 190) return plain;
  const truncated = plain.slice(0, 190).replace(/\s+\S*$/, '').trim();
  return truncated ? truncated + '…' : '';
}

export type ArticleSection = { index: number; id: string; label: string };
export function articleSections(paragraphs: readonly string[]): ArticleSection[] {
  return paragraphs.flatMap((paragraph, index) => {
    if (!paragraph.startsWith('## ')) return [];
    const label = paragraph.slice(3).trim();
    if (!label) return [];
    const slug = label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 54).replace(/^-|-$/g, '');
    return [{ index, id: 'section-' + index + (slug ? '-' + slug : ''), label }];
  });
}
