import { supabase } from '@/src/lib/supabase';

/**
 * Notification / email API base URL.
 * - Dev: empty → relative `/api/*` (Vite proxy → localhost:3001)
 * - Prod: set VITE_NOTIFY_API_URL to your Render service, e.g. https://lamtex-notify.onrender.com
 */
export function notifyApiUrl(path: string): string {
  const base = (import.meta.env.VITE_NOTIFY_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/**
 * Fetch the notify API, attaching the current Supabase access token so the
 * server can authenticate the caller (see server/lib/notifyAuth.ts).
 */
export async function notifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // No session (e.g. public page) — send unauthenticated; server decides.
  }
  return fetch(notifyApiUrl(path), { ...init, headers });
}
