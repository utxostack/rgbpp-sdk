import { defineConfig } from 'tsup';
import { name } from './package.json';

export default defineConfig({
  name,
  dts: true,
  clean: true,
  bundle: true,
  sourcemap: true,
  splitting: true,
  target: 'esnext',
  format: ['esm', 'cjs'],
  entry: ['src/index.ts'],
});
