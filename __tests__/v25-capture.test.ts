import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RenderedPage } from '@/app/_components/RenderedPage';
import { getRawCapturedPage } from '@/app/_components/captured-pages';

describe('bundled v25 page captures', () => {
  it('renders the real homepage capture with its rewritten hero video', () => {
    const markup = renderToStaticMarkup(
      createElement(RenderedPage, { pathName: '/' }),
    );

    expect(markup).toContain('You Already');
    expect(markup).toContain(
      'data-ugt-video="/assets/light-v1/video/hero-main.mp4"',
    );
    expect(markup).not.toContain('src="/assets/video/hero-main.mp4"');
  });

  it('returns bundled capture source and rejects an unknown page key', () => {
    expect(getRawCapturedPage('home')).toContain('You Already');
    expect(getRawCapturedPage('not-a-real-page')).toBeNull();
  });

  it('keeps the production capture path independent of the Node filesystem', () => {
    const root = process.cwd();
    const sources = [
      path.join(root, 'app', '_components', 'RenderedPage.tsx'),
      path.join(root, 'app', '_components', 'captured-pages.ts'),
    ].map((file) => readFileSync(file, 'utf8'));

    for (const source of sources) {
      expect(source).not.toMatch(/(?:node:fs|\bexistsSync\b|\breadFileSync\b)/);
    }

    expect(sources[1]).toMatch(/\.html\?rendered-page/);
  });
});
