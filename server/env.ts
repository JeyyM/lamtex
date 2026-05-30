/** Read env vars; strips surrounding quotes (common when importing .env files into Vercel). */
export function readEnv(name: string, fallback?: string): string | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || fallback;
}
