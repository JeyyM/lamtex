/** Extract a preview image URL from open-graph-scraper result fields. */
export function extractOgImageUrl(
  result: Record<string, unknown>,
  pageUrl: string,
): string | null {
  const fields = [result.ogImage, result.twitterImage];
  for (const field of fields) {
    const resolved = resolveOgImageCandidate(field, pageUrl);
    if (resolved) return resolved;
  }
  return null;
}

function resolveOgImageCandidate(value: unknown, pageUrl: string): string | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    return normalizeImageUrl(value.trim(), pageUrl);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveOgImageCandidate(item, pageUrl);
      if (resolved) return resolved;
    }
    return null;
  }

  if (typeof value === 'object') {
    const url = (value as { url?: unknown }).url;
    if (typeof url === 'string') {
      return normalizeImageUrl(url.trim(), pageUrl);
    }
  }

  return null;
}

function normalizeImageUrl(raw: string, pageUrl: string): string | null {
  if (!raw) return null;
  try {
    const absolute = /^https?:\/\//i.test(raw) ? raw : new URL(raw, pageUrl).href;
    const parsed = new URL(absolute);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // Prefer HTTPS for mixed-content safety in the browser.
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    return parsed.href;
  } catch {
    return null;
  }
}
