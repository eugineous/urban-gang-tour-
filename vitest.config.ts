import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
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
