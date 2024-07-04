import { defineConfig } from 'tsup';
import { name } from './package.json';

export default defineConfig({
  name,
  dts: true,
  clean: true,
  bundle: true,
  sourcemap: true,
  splitting: true,
  cjsInterop: true,
  target: 'esnext',
  platform: 'neutral',
  format: ['esm', 'cjs'],
  entry: ['src/index.ts', 'src/btc.ts', 'src/ckb.ts', 'src/service.ts'],
});