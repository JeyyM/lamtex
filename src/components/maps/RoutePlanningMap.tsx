import React, { useEffect, useRef, useState } from 'react';
import { getGoogleMapsApiKey, loadGoogleMapsJs } from '@/src/lib/maps';
import { blueCustomerPinIcon } from '@/src/lib/customerMapPinIcon';

export type RoutePlanningStop = {
  lat: number;
  lng: number;
  title: string;
  orderId: string;
};

type Props = {
  /** Depot / branch — optional drawn first on path. */
  originLat?: number | null;
  originLng?: number | null;
  originTitle?: string;
  /** Selected delivery stops (customer map pins), in visit order. */
  stops: RoutePlanningStop[];
  /**
   * When provided (from DirectionsService), renders the real road polyline
   * via DirectionsRenderer instead of a straight-line fallback.
   */
  directionsResult?: google.maps.DirectionsResult | null;
  className?: string;
};

const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

/**
 * Google Map for logistics route planning: branch origin + numbered customer pins and a simple path.
 */
export function RoutePlanningMap({
  originLat,
  originLng,
  originTitle = 'Depot / branch',
  stops,
  directionsResult,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [loadError, setLoadError] = useState<'missing_key' | 'load_failed' | null>(null);
  const [loading, setLoading] = useState(true);

  const stopsKey = stops.map((s) => `${s.orderId}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join('|');
  // Stable key for directionsResult so effect re-runs only when the route changes
  const directionsKey = directionsResult
    ? directionsResult.routes[0]?.legs?.map((l) => l.distance?.value).join(',') ?? 'dr'
    : 'none';

  useEffect(() => {
    const key = getGoogleMapsApiKey();
    if (!key) {
      setLoading(false);
      setLoadError('missing_key');
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    loadGoogleMapsJs()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        // Clear previous overlays
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        polyRef.current?.setMap(null);
        polyRef.current = null;
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
          directionsRendererRef.current = null;
        }

        const oLa = originLat != null ? Number(originLat) : NaN;
        const oLn = originLng != null ? Number(originLng) : NaN;
        const hasOrigin = Number.isFinite(oLa) && Number.isFinite(oLn);

        const map = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;

        // --- Always draw depot/origin marker ---
        if (hasOrigin) {
          const om = new google.maps.Marker({
            map,
            position: { lat: oLa, lng: oLn },
            title: originTitle,
            zIndex: 5,
          });
          markersRef.current.push(om);
        }

        // --- Numbered delivery stop markers ---
        stops.forEach((s, i) => {
          const m = new google.maps.Marker({
            map,
            position: { lat: s.lat, lng: s.lng },
            title: s.title,
            label: {
              text: String(i + 1),
              color: '#1e3a8a',
              fontSize: '12px',
              fontWeight: '700',
            },
            icon: blueCustomerPinIcon(),
            zIndex: 10 + i,
          });
          markersRef.current.push(m);
        });

        // --- Route polyline: real roads via DirectionsRenderer, or straight-line fallback ---
        if (directionsResult) {
          // Real road route from DirectionsService
          const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true, // we draw our own numbered pins above
            polylineOptions: {
              strokeColor: '#2563eb',
              strokeOpacity: 0.9,
              strokeWeight: 4,
            },
            preserveViewport: true, // we handle fitBounds below
          });
          renderer.setDirections(directionsResult);
          directionsRendererRef.current = renderer;
        } else {
          // Fallback: straight-line polyline when no directions result yet
          const path: google.maps.LatLngLiteral[] = [];
          if (hasOrigin) path.push({ lat: oLa, lng: oLn });
          stops.forEach((s) => path.push({ lat: s.lat, lng: s.lng }));

          if (path.length >= 2) {
            polyRef.current = new google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: '#2563eb',
              strokeOpacity: 0.5,
              strokeWeight: 2,
              icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW }, offset: '100%', repeat: '80px' }],
              map,
            });
          }
        }

        // Fit bounds to all visible points
        const boundsPoints: google.maps.LatLngLiteral[] = [];
        if (hasOrigin) boundsPoints.push({ lat: oLa, lng: oLn });
        stops.forEach((s) => boundsPoints.push({ lat: s.lat, lng: s.lng }));

        if (boundsPoints.length === 1) {
          map.setCenter(boundsPoints[0]);
          map.setZoom(14);
        } else if (boundsPoints.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          boundsPoints.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 72);
        } else {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(11);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('load_failed');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polyRef.current?.setMap(null);
      polyRef.current = null;
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      mapRef.current = null;
      if (el) el.innerHTML = '';
    };
  }, [originLat, originLng, originTitle, stopsKey, stops, directionsKey, directionsResult]);

  if (loadError === 'missing_key') {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-600 ${className}`}
      >
        Add <code className="mx-1 rounded bg-gray-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
        <code className="mx-1 rounded bg-gray-200 px-1">.env.local</code> and enable the{' '}
        <span className="font-medium">Maps JavaScript API</span>.
      </div>
    );
  }

  if (loadError === 'load_failed') {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 px-4 text-center text-sm text-red-800 ${className}`}
      >
        Could not load Google Maps. Enable the <span className="font-medium">Maps JavaScript API</span> for this key,
        then refresh.
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 text-sm text-gray-600">
          Loading map…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full min-h-[320px] md:min-h-[384px]" />
    </div>
  );
}
