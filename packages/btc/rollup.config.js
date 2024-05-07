import { dts } from 'rollup-plugin-dts';

const config = [
  // …
  {
    input: './lib/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];

module.exports = config;
