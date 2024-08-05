import { defineConfig } from 'tsup';

export default defineConfig({
  name: '@rgbpp-sdk/btc',
  dts: true,
  clean: true,
  sourcemap: true,
  format: ['esm', 'cjs'],
  entry: ['src/index.ts'],
});
