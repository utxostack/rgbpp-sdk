import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    testTimeout: 15000,
    reporters: ['verbose'],
    exclude: ['lib', 'node_modules'],
  },
});
