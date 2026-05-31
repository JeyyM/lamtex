/**
 * Single Vercel entry for all nested /api/* routes (notifications, link-preview, etc.).
 * vercel.json rewrites /api/(.*) → /api/index?originalPath=$1
 * Dedicated handlers (api/health.ts, api/cron/*) are matched by the filesystem first.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'node:path';
import { createRequire } from 'node:module';
import { rebuildVercelApiUrl } from './vercelApiUrl';

/** Express reads the raw body via express.json() — disable Vercel's default parser. */
export const config = {
  api: {
    bodyParser: false,
  },
};

type ServerlessHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

const require = createRequire(path.join(process.cwd(), 'package.json'));

let cachedHandler: ServerlessHandler | null = null;

function resolveBundlePath(): string {
  const candidates = [
    path.join(process.cwd(), 'api', 'vercel-api.cjs'),
    path.join(process.cwd(), 'vercel-api.cjs'),
  ];
  for (const candidate of candidates) {
    try {
      require.resolve(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    `Express API bundle missing (api/vercel-api.cjs). cwd=${process.cwd()} — ensure npm run build:api ran.`,
  );
}

function getHandler(): ServerlessHandler {
  if (!cachedHandler) {
    const bundlePath = resolveBundlePath();
    cachedHandler = require(bundlePath).default as ServerlessHandler;
  }
  return cachedHandler;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    req.url = rebuildVercelApiUrl(req);
    await getHandler()(req, res);
  } catch (err) {
    console.error('[api/index] handler error', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal error',
      });
    }
  }
}
