'use strict';

const fs = require('node:fs');
const path = require('node:path');

let cachedHandler = null;

function loadHandler() {
  if (cachedHandler) return cachedHandler;

  const candidates = [
    path.join(__dirname, 'vercel-api.cjs'),
    path.join(process.cwd(), 'api', 'vercel-api.cjs'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const mod = require(candidate);
    const handler = mod.default ?? mod;
    if (typeof handler !== 'function') {
      throw new Error(`Invalid handler export in ${candidate}`);
    }
    cachedHandler = handler;
    return cachedHandler;
  }

  throw new Error(`vercel-api.cjs not found. Checked: ${candidates.join('; ')}`);
}

module.exports = async function handler(req, res) {
  try {
    await loadHandler()(req, res);
  } catch (err) {
    console.error('[api/index]', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal error',
      });
    }
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
