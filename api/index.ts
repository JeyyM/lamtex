/**
 * Vercel serverless entry (committed source). Express app is bundled to lib/vercel-api.cjs at build time.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bundled = require('../lib/vercel-api.cjs') as {
  default: (req: VercelRequest, res: VercelResponse) => unknown;
};

export default function handler(req: VercelRequest, res: VercelResponse): unknown {
  return bundled.default(req, res);
}
