/**
 * Single Vercel entry for all nested /api/* routes (notifications, link-preview, etc.).
 * vercel.json rewrites /api/(.*) → /api/index?originalPath=$1
 * Dedicated handlers (api/health.ts, api/cron/*) are matched by the filesystem first.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';
import { createRequire } from 'node:module';
import { rebuildVercelApiUrl } from './vercelApiUrl';

const require = createRequire(import.meta.url);

let cachedApp: Express | null = null;

function getApp(): Express {
  if (!cachedApp) {
    const bundled = require('../lib/vercel-api.cjs') as { default: Express };
    cachedApp = bundled.default;
  }
  return cachedApp;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  req.url = rebuildVercelApiUrl(req);
  getApp()(req, res);
}
