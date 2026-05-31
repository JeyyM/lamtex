import type { VercelRequest } from '@vercel/node';

/**
 * Rebuild the Express-facing URL on Vercel.
 * Nested paths like /api/notifications/order-created do not reach Express reliably
 * via api/[...path].ts — use vercel.json rewrite → /api/index?originalPath=...
 */
export function rebuildVercelApiUrl(req: VercelRequest): string {
  const originalPath = req.query.originalPath;
  if (originalPath != null && String(originalPath).trim() !== '') {
    const suffix = Array.isArray(originalPath)
      ? originalPath.map(String).join('/')
      : String(originalPath);
    const base = `/api/${suffix.replace(/^\/+/, '')}`;
    const qIndex = req.url?.indexOf('?') ?? -1;
    if (qIndex >= 0 && req.url) {
      const params = new URLSearchParams(req.url.slice(qIndex + 1));
      params.delete('originalPath');
      const rest = params.toString();
      return rest ? `${base}?${rest}` : base;
    }
    return base;
  }

  const headerCandidates = [
    req.headers['x-vercel-forwarded-url'],
    req.headers['x-forwarded-uri'],
    req.headers['x-invoke-path'],
    req.headers['x-matched-path'],
  ];
  for (const candidate of headerCandidates) {
    if (typeof candidate !== 'string') continue;
    const pathOnly = candidate.split('?')[0];
    if (pathOnly.startsWith('/api/') && pathOnly !== '/api/index') {
      return candidate.startsWith('/api') ? candidate : pathOnly;
    }
  }

  if (req.url && req.url.startsWith('/api/') && !req.url.startsWith('/api/index')) {
    return req.url;
  }

  return req.url ?? '/api';
}
