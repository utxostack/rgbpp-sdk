import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    testTimeout: 10000,
    exclude: ['lib', 'node_modules'],
  },
});
