import { lookup } from 'node:dns/promises';

/**
 * SSRF guard for server-side URL fetching (e.g. link previews).
 *
 * Blocks requests to non-public destinations so an attacker can't use our
 * server to reach internal services, cloud metadata endpoints, or localhost.
 *
 * Checks:
 *   - protocol must be http/https
 *   - hostname must resolve only to public (non-private/reserved) IPs
 *
 * Resolving DNS and checking the *resolved* IPs (not just the literal host)
 * also defeats hostnames that point at internal ranges.
 */

function ipv4ToParts(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

/** True for private, loopback, link-local, and other reserved IPv4/IPv6 ranges. */
export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();

  // IPv6 loopback / unspecified
  if (normalized === '::1' || normalized === '::') return true;

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) → check the embedded v4
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const v4 = mapped ? mapped[1] : normalized;

  const parts = ipv4ToParts(v4);
  if (!parts) {
    // Not an IPv4 literal; if it was a non-mapped IPv6 we already handled the
    // dangerous ranges above. Treat remaining global IPv6 as allowed.
    return false;
  }

  const [a, b] = parts;
  if (a === 0) return true;                       // 0.0.0.0/8
  if (a === 10) return true;                      // 10.0.0.0/8 private
  if (a === 127) return true;                     // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;        // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true;        // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true;                      // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved

  return false;
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/**
 * Throws SsrfBlockedError if the URL is not a safe public http(s) destination.
 * Resolves DNS and rejects if any resolved address is private/reserved.
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError('Only http(s) URLs are allowed');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new SsrfBlockedError('Host not allowed');
  }

  // If the host is already an IP literal, check it directly.
  if (isPrivateOrReservedIp(hostname)) {
    throw new SsrfBlockedError('Host resolves to a private address');
  }

  // Resolve DNS and reject if any address is private/reserved.
  try {
    const results = await lookup(hostname, { all: true });
    if (!results.length) {
      throw new SsrfBlockedError('Host did not resolve');
    }
    for (const { address } of results) {
      if (isPrivateOrReservedIp(address)) {
        throw new SsrfBlockedError('Host resolves to a private address');
      }
    }
  } catch (err) {
    if (err instanceof SsrfBlockedError) throw err;
    throw new SsrfBlockedError('Host could not be resolved');
  }

  return url;
}
