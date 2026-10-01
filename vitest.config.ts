import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    // Match Next's automatic JSX runtime when component modules are exercised
    // directly by server-rendering tests.
    jsx: 'automatic',
  },
  plugins: [
    {
      // next.config.mjs bundles the v25 HTML captures as source assets. Mirror
      // that rule in Vitest so regression tests exercise the same static
      // imports instead of reading app/_rendered at runtime.
      name: 'rendered-page-source',
      enforce: 'pre',
      load(id) {
        const [file, query] = id.split('?', 2);
        if (query !== 'rendered-page') return null;
        return `export default ${JSON.stringify(readFileSync(file, 'utf8'))};`;
      },
    },
  ],
  // Mirror tsconfig's `@/*` -> repo root path so tests can import the same
  // specifiers the app does (`@/lib/server/...`).
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
  },
});
