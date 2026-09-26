import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () => readFileSync(resolve(__dirname, '../app/_components/HomePage.tsx'), 'utf8');

describe('Home equal hubs', () => {
  it('monuments Tickets, Book, and Shop with equal PathCard doors', () => {
    const s = src();
    expect(s).toContain('PathCard');
    expect(s).toContain('href="/events"');
    expect(s).toContain('href="/book"');
    expect(s).toContain('href="/shop"');
    expect(s).toContain('number="01"');
    expect(s).toContain('number="02"');
    expect(s).toContain('number="03"');
    expect(s).not.toMatch(/PathCard[\s\S]{0,120}href="\/work-with-us"/);
    expect(s).not.toMatch(/PathCard[\s\S]{0,120}href="\/blog"/);
  });
  it('keeps fail-closed empty copy when no events', () => {
    expect(src()).toMatch(/no public events|next chapter is loading/i);
  });
});