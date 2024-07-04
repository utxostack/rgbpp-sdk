import { defineConfig } from 'tsup';
import { name } from './package.json';

export default defineConfig({
  name,
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'esnext',
  format: ['esm', 'cjs'],
  entry: ['src/index.ts'],
});
