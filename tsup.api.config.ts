import { defineConfig } from 'tsup';

/** Bundle Express API for Vercel (CJS output loaded by api/index.ts). */
export default defineConfig({
  entry: { 'vercel-api': 'server/vercel-handler.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'api',
  clean: false,
  splitting: false,
  sourcemap: false,
  minify: false,
  bundle: true,
  outExtension: () => ({ js: '.cjs' }),
});
