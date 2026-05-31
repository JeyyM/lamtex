import { defineConfig } from 'tsup';

/** Bundle Express + serverless-http for Vercel (single self-contained CJS file). */
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
  /** Inline all npm deps — vercel-api.cjs is includeFiles, not dependency-traced by Vercel. */
  noExternal: [/.*/],
  outExtension: () => ({ js: '.cjs' }),
});
