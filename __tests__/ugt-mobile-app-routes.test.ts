import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = () => readFileSync(resolve(__dirname, '../app/_components/MobileApp.tsx'), 'utf8');

describe('MobileApp route shrinkage', () => {
  it('never mounts MobileApp on Home', () => {
    expect(src()).toMatch(/pathname === '\/'\s*\)?\s*return null/);
  });
});