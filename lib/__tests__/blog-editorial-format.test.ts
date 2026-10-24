import { describe, expect, it } from 'vitest';
import { URBAN_NEWS_AUTHOR, articleSections, fallbackDeck, readingMinutes } from '@/lib/blog-editorial-format';

describe('Urban News editorial defaults', () => {
  it('has exactly one requested public byline', () => { expect(URBAN_NEWS_AUTHOR).toBe('Eugine Micah'); });
  it('derives stable unique navigation anchors from H2 content', () => {
    const sections = articleSections(['Intro.', '## What went wrong?', '## What went wrong?', '### Deeper point']);
    expect(sections).toHaveLength(2);
    expect(sections[0].id).not.toBe(sections[1].id);
  });
  it('does not invent a deck when there is no source content', () => {
    expect(fallbackDeck('', [])).toBe('');
    expect(fallbackDeck('Existing verified description', ['A different lead'])).toBe('Existing verified description');
  });
  it('estimates reading time from actual body length', () => {
    expect(readingMinutes([])).toBe(1);
    expect(readingMinutes([Array(441).fill('word').join(' ')])).toBe(3);
  });
});
