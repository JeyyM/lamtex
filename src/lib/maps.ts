/**
 * Google Maps helpers. Loads Maps JS with the `places` library (address search).
 * In Google Cloud: enable Maps JavaScript API and Places API (Autocomplete).
 *
 * Env: VITE_GOOGLE_MAPS_API_KEY
 */
export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
}

let mapsJsPromise: Promise<void> | null = null;

/** Loads the Maps JavaScript API once (for interactive maps). */
export function loadGoogleMapsJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps?.Map) return Promise.resolve();

  const key = getGoogleMapsApiKey();
  if (!key) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));

  if (!mapsJsPromise) {
    mapsJsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-lamtex-google-maps-js]');
      if (existing) {
        const onLoad = () => {
          if (window.google?.maps?.Map) resolve();
          else reject(new Error('Google Maps API did not initialize'));
        };
        if (window.google?.maps?.Map) {
          resolve();
          return;
        }
        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', () => {
          mapsJsPromise = null;
          reject(new Error('Google Maps script failed'));
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.lamtexGoogleMapsJs = 'true';
      script.onload = () => {
        if (window.google?.maps?.Map) resolve();
        else {
          mapsJsPromise = null;
          reject(new Error('Google Maps API did not initialize'));
        }
      };
      script.onerror = () => {
        mapsJsPromise = null;
        reject(new Error('Failed to load Google Maps JavaScript API'));
      };
      document.head.appendChild(script);
    });
  }
  return mapsJsPromise;
}

/** Opens Google Maps search in a new tab (no API key required). */
export function openGoogleMapsSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * iframe src for Maps Embed API – “view” centered on coordinates.
 * @see https://developers.google.com/maps/documentation/embed/embedding-map
 */
export function googleMapsEmbedViewUrl(lat: number, lng: number, zoom: number, apiKey: string): string {
  const key = apiKey.trim();
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const z = Math.min(21, Math.max(1, Math.round(zoom)));
  return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${lat},${lng}&zoom=${z}&maptype=roadmap`;
}

export function canShowGoogleMapEmbed(apiKey: string, lat: number, lng: number): boolean {
  return Boolean(apiKey.trim()) && Number.isFinite(lat) && Number.isFinite(lng);
}
