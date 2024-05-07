import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'rgbpp-ckb',
      // the proper extensions will be added
      fileName: 'index',
      formats: ['es', 'umd', 'cjs'],
    },
    minify: false,
    rollupOptions: {
      external: ['node-fetch', 'crypto'],
      // make sure to externalize deps that shouldn't be bundled
      // into your library
    },
  },
});
