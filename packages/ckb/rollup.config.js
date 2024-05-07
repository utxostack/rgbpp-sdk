import { dts } from 'rollup-plugin-dts';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const config = [
  // …
  {
    input: './lib/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts(), nodePolyfills()],
  },
];

module.exports = config;
