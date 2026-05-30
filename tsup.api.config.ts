import { defineConfig } from 'tsup';

/** Bundle Express API for Vercel (avoids ESM / type:module runtime crashes). */
export default defineConfig({
  entry: { index: 'server/vercel-handler.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'api',
  clean: false,
  splitting: false,
  sourcemap: false,
  minify: false,
  bundle: true,
  noExternal: [/.*/],
  outExtension: () => ({ js: '.cjs' }),
});
