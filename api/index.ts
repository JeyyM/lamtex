/**
 * Single Vercel entry for all nested /api/* routes (notifications, link-preview, etc.).
 * vercel.json rewrites /api/(.*) → /api/index?originalPath=$1
 * Dedicated handlers (api/health.ts, api/cron/*) are matched by the filesystem first.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { createRequire } from 'node:module';
import { rebuildVercelApiUrl } from './vercelApiUrl';

/** Express reads the raw body via express.json() — disable Vercel's default parser. */
export const config = {
  api: {
    bodyParser: false,
  },
};

const require = createRequire(import.meta.url);

let cachedApp: Express | null = null;

function getApp(): Express {
  if (!cachedApp) {
    const bundled = require('./vercel-api.cjs') as { default: Express };
    cachedApp = bundled.default;
  }
  return cachedApp;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  try {
    req.url = rebuildVercelApiUrl(req);
    getApp()(req, res);
  } catch (err) {
    console.error('[api/index] handler error', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal error',
      });
    }
  }
}
