import { defineConfig } from 'tsup';

/** Bundle Express + serverless-http for Vercel (CJS loaded by api/index.ts). */
export default defineConfig({
  entry: { 'vercel-api': 'api/vercelEntry.ts' },
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
