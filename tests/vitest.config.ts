import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@archive/contracts': path.resolve(__dirname, '../packages/contracts/src'),
      '@archive/database/seed': path.resolve(__dirname, '../packages/database/src/seed.ts'),
      '@archive/database': path.resolve(__dirname, '../packages/database/src'),
      '@archive/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@archive/module-core': path.resolve(__dirname, '../modules/core/src'),
      '@archive/module-media': path.resolve(__dirname, '../modules/media/src'),
      '@archive/module-comment': path.resolve(__dirname, '../modules/comment/src'),
      '@archive/api': path.resolve(__dirname, '../workers/api/src'),
    },
  },
  test: {
    name: 'e2e',
    include: ['e2e/**/*.spec.ts'],
  },
});
