import type { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readEnv } from '../env';

/**
 * Authentication middleware for the notify API.
 *
 * The /api/notifications/* and /api/link-preview endpoints are called from the
 * browser by logged-in staff. Without auth, anyone on the internet can POST to
 * them (email spam / SSRF abuse). This middleware verifies the caller's
 * Supabase access token (the same session the SPA already holds).
 *
 * SAFE ROLLOUT: enforcement is enabled only when the server has Supabase
 * credentials configured (SUPABASE_URL + SUPABASE_ANON_KEY, or the VITE_*
 * fallbacks). If they're missing, the middleware logs a warning and allows the
 * request through, so deploying this code does not break an environment that
 * hasn't set the vars yet. Set them on the notify service (Render) to turn
 * enforcement on.
 */

let cachedClient: SupabaseClient | null | undefined;
let warned = false;

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = readEnv('SUPABASE_URL') ?? readEnv('VITE_SUPABASE_URL');
  const anonKey = readEnv('SUPABASE_ANON_KEY') ?? readEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function createNotifyAuthMiddleware() {
  return function notifyAuth(req: Request, res: Response, next: NextFunction): void {
    const client = getClient();

    if (!client) {
      if (!warned) {
        warned = true;
        console.warn(
          '[notify-server] AUTH DISABLED: SUPABASE_URL / SUPABASE_ANON_KEY not set. ' +
            'Notify endpoints are unauthenticated. Set them on the notify service to enforce auth.',
        );
      }
      next();
      return;
    }

    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    void client.auth
      .getUser(token)
      .then(({ data, error }) => {
        if (error || !data?.user) {
          res.status(401).json({ error: 'Invalid or expired session' });
          return;
        }
        next();
      })
      .catch((err) => {
        console.error('[notify-server] auth check failed', err);
        res.status(401).json({ error: 'Authentication failed' });
      });
  };
}
