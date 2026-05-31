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

export function notifyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(notifyApiUrl(path), init);
}
