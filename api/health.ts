/** Fast health check — no Express bundle (avoids cold-start timeout). */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'node:fs';
import path from 'node:path';

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const bundlePath = path.join(process.cwd(), 'api', 'vercel-api.cjs');
  res.status(200).json({
    ok: true,
    resendConfigured: Boolean(readEnv('RESEND_API_KEY')),
    emailOverride: readEnv('NOTIFICATIONS_EMAIL_OVERRIDE') ?? null,
    fromEmail: readEnv('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev',
    apiBundlePresent: fs.existsSync(bundlePath),
  });
}
