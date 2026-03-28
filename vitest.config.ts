import { defineConfig } from 'vitest/config';
export default defineConfig({
  assetsInclude: ['**/*.md'],
  test: {
    environment: 'node',
    globals: true,
    alias: {
      obsidian: new URL('./src/__mocks__/obsidian.ts', import.meta.url).pathname,
    },
  },
});
