import React, { useEffect, useRef, useState } from 'react';
import { getGoogleMapsApiKey, loadGoogleMapsJs } from '@/src/lib/maps';
import { blueCustomerPinIcon } from '@/src/lib/customerMapPinIcon';

type Props = {
  customerLat: number;
  customerLng: number;
  customerTitle?: string;
  /** Branch store / HQ — default red Google pin when coordinates exist. */
  storeLat?: number | null;
  storeLng?: number | null;
  storeTitle?: string;
  className?: string;
};

/**
 * Read-only map with real markers (Maps Embed “view” mode does not draw a pin).
 */
export function CustomerLocationMapPreview({
  customerLat,
  customerLng,
  customerTitle = 'Customer location',
  storeLat,
  storeLng,
  storeTitle = 'Store / HQ',
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const storeMarkerRef = useRef<google.maps.Marker | null>(null);

  const [loadError, setLoadError] = useState<'missing_key' | 'load_failed' | null>(null);
  const [loading, setLoading] = useState(true);

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
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: customerLat, lng: customerLng },
          zoom: 16,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;

        customerMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: customerLat, lng: customerLng },
          draggable: false,
          title: customerTitle,
          icon: blueCustomerPinIcon(),
          zIndex: 2,
        });

        const sLat = storeLat != null ? Number(storeLat) : NaN;
        const sLng = storeLng != null ? Number(storeLng) : NaN;
        const hasStore = Number.isFinite(sLat) && Number.isFinite(sLng);

        if (hasStore) {
          storeMarkerRef.current = new google.maps.Marker({
            map,
            position: { lat: sLat, lng: sLng },
            draggable: false,
            title: storeTitle,
            zIndex: 1,
          });
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: customerLat, lng: customerLng });
          bounds.extend({ lat: sLat, lng: sLng });
          map.fitBounds(bounds, 56);
        } else {
          map.setCenter({ lat: customerLat, lng: customerLng });
          map.setZoom(16);
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
      customerMarkerRef.current?.setMap(null);
      customerMarkerRef.current = null;
      storeMarkerRef.current?.setMap(null);
      storeMarkerRef.current = null;
      mapRef.current = null;
      if (el) el.innerHTML = '';
    };
  }, [customerLat, customerLng, customerTitle, storeLat, storeLng, storeTitle]);

  if (loadError === 'missing_key') {
    return (
      <div
        className={`flex min-h-[256px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-600 ${className}`}
      >
        Add <code className="mx-1 rounded bg-gray-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
        <code className="mx-1 rounded bg-gray-200 px-1">.env.local</code> and enable the{' '}
        <span className="font-medium">Maps JavaScript API</span> for that key.
      </div>
    );
  }

  if (loadError === 'load_failed') {
    return (
      <div
        className={`flex min-h-[256px] items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 px-4 text-center text-sm text-red-800 ${className}`}
      >
        Could not load Google Maps. In Google Cloud Console, enable the{' '}
        <span className="font-medium">Maps JavaScript API</span> for this API key, then refresh the page.
      </div>
    );
  }

  return (
    <div className={`relative h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 text-sm text-gray-600">
          Loading map…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full min-h-[256px]" />
    </div>
  );
}
