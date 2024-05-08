import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    reporters: ['verbose'],
    exclude: ['lib', 'node_modules'],
  },
});
