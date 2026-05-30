/**
 * Vercel catch-all for /api/* (notifications, link-preview, health).
 * Rebuilds req.url so Express routes like /api/notifications/... match on serverless.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/app';

function rebuildApiUrl(req: VercelRequest): string {
  const headerCandidates = [
    req.headers['x-vercel-forwarded-url'],
    req.headers['x-forwarded-uri'],
    req.headers['x-invoke-path'],
    req.headers['x-matched-path'],
  ];
  for (const candidate of headerCandidates) {
    if (typeof candidate === 'string' && candidate.startsWith('/api')) {
      return candidate;
    }
  }

  const pathParam = req.query.path;
  const suffix = pathParam
    ? Array.isArray(pathParam)
      ? pathParam.map(String).join('/')
      : String(pathParam)
    : '';
  const queryStart = req.url?.indexOf('?') ?? -1;
  const query = queryStart >= 0 ? req.url!.slice(queryStart) : '';

  if (suffix) return `/api/${suffix}${query}`;
  if (req.url && req.url.startsWith('/api')) return req.url;
  return `/api${query}`;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  req.url = rebuildApiUrl(req);
  app(req, res);
}
