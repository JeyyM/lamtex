import React, { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { getGoogleMapsApiKey, loadGoogleMapsJs } from '@/src/lib/maps';
import { blueCustomerPinIcon } from '@/src/lib/customerMapPinIcon';

/** Default center (Metro Manila) when no pin is set yet. */
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

export type CompanyMapPickerPinColor = 'default' | 'blue';

function markerIconForPinColor(
  pinColor: CompanyMapPickerPinColor | undefined,
): google.maps.Icon | google.maps.Symbol | string | undefined {
  if (pinColor !== 'blue') return undefined;
  return blueCustomerPinIcon();
}

type Props = {
  lat: number | null;
  lng: number | null;
  onPositionChange: (lat: number, lng: number) => void;
  /** Pin label on hover / accessibility. */
  markerTitle?: string;
  /** `blue` = custom blue pin (white outline + center dot); `default` = standard red Maps marker. */
  pinColor?: CompanyMapPickerPinColor;
  /** Unique id for the search field (avoid duplicate ids when multiple pickers exist). */
  searchInputId?: string;
  searchInputName?: string;
  /**
   * Optional fixed marker (e.g. branch store / HQ): default red Google pin, not draggable.
   * Shown together with the primary editable pin (e.g. blue customer pin).
   */
  referencePin?: { lat: number; lng: number; title?: string } | null;
};

export function CompanyMapPicker({
  lat,
  lng,
  onPositionChange,
  markerTitle = 'Company HQ — drag to adjust',
  pinColor = 'default',
  searchInputId = 'company-map-search',
  searchInputName = 'lamtex_gmaps_place_query',
  referencePin = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const referenceMarkerRef = useRef<google.maps.Marker | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const placeMarkerAtRef = useRef<(position: google.maps.LatLngLiteral, pan: boolean) => void>(() => {});

  const [loadError, setLoadError] = useState<'missing_key' | 'load_failed' | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  /** Stops Chrome "saved addresses" until the user focuses the field once. */
  const [mapSearchUnlocked, setMapSearchUnlocked] = useState(false);

  useEffect(() => {
    if (!mapReady || loading) setMapSearchUnlocked(false);
  }, [mapReady, loading]);

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
    let autocomplete: google.maps.places.Autocomplete | undefined;

    const placeMarker = (position: google.maps.LatLngLiteral, pan: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      const icon = markerIconForPinColor(pinColor);
      if (markerRef.current) {
        markerRef.current.setPosition(position);
        markerRef.current.setIcon(icon as google.maps.Icon | google.maps.Symbol | string | undefined);
        markerRef.current.setTitle(markerTitle);
      } else {
        const marker = new google.maps.Marker({
          map,
          position,
          draggable: true,
          title: markerTitle,
          icon: icon as google.maps.Icon | google.maps.Symbol | string | undefined,
        });
        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (p) onPositionChangeRef.current(p.lat(), p.lng());
        });
        markerRef.current = marker;
      }
      if (pan) {
        map.panTo(position);
      }
    };

    loadGoogleMapsJs()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const hasPin =
          lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
        const ref = referencePin;
        const hasRef =
          ref != null && Number.isFinite(ref.lat) && Number.isFinite(ref.lng);
        const center = hasPin
          ? { lat: lat as number, lng: lng as number }
          : hasRef
            ? { lat: ref!.lat, lng: ref!.lng }
            : DEFAULT_CENTER;
        const zoom = hasPin ? 16 : hasRef ? 14 : 12;
        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;
        placeMarkerAtRef.current = placeMarker;

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const p = e.latLng.toJSON();
          placeMarker(p, true);
          onPositionChangeRef.current(p.lat, p.lng);
        });

        if (hasPin) {
          placeMarker({ lat: lat as number, lng: lng as number }, false);
        }

        const searchEl = searchInputRef.current;
        if (searchEl && google.maps.places?.Autocomplete) {
          autocomplete = new google.maps.places.Autocomplete(searchEl, {
            fields: ['geometry', 'formatted_address', 'name'],
            componentRestrictions: { country: 'ph' },
          });
          autocomplete.bindTo('bounds', map);
          autocomplete.addListener('place_changed', () => {
            if (cancelled) return;
            const place = autocomplete!.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            const la = loc.lat();
            const ln = loc.lng();
            placeMarker({ lat: la, lng: ln }, true);
            if (place.geometry?.viewport) {
              map.fitBounds(place.geometry.viewport);
            } else {
              map.setCenter({ lat: la, lng: ln });
              map.setZoom(16);
            }
            onPositionChangeRef.current(la, ln);
          });
        }

        setMapReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('load_failed');
          setLoading(false);
          setMapReady(false);
        }
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      placeMarkerAtRef.current = () => {};
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
      markerRef.current?.setMap(null);
      markerRef.current = null;
      referenceMarkerRef.current?.setMap(null);
      referenceMarkerRef.current = null;
      mapRef.current = null;
      if (el) el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lat/lng sync in next effect; referencePin synced below
  }, [pinColor, markerTitle, referencePin?.lat, referencePin?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const ref = referencePin;
    if (!ref || !Number.isFinite(ref.lat) || !Number.isFinite(ref.lng)) {
      referenceMarkerRef.current?.setMap(null);
      referenceMarkerRef.current = null;
      return;
    }
    const pos = { lat: ref.lat, lng: ref.lng };
    const title = ref.title?.trim() || 'Store / HQ';
    if (referenceMarkerRef.current) {
      referenceMarkerRef.current.setPosition(pos);
      referenceMarkerRef.current.setTitle(title);
    } else {
      referenceMarkerRef.current = new google.maps.Marker({
        map,
        position: pos,
        draggable: false,
        title,
        zIndex: 1,
      });
    }
    const hasCustomerPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasCustomerPin) {
      map.panTo(pos);
      map.setZoom(14);
    }
  }, [mapReady, referencePin?.lat, referencePin?.lng, referencePin?.title, lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasPin) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }

    const position = { lat: lat as number, lng: lng as number };
    const icon = markerIconForPinColor(pinColor);
    if (markerRef.current) {
      const cur = markerRef.current.getPosition();
      if (
        cur &&
        Math.abs(cur.lat() - position.lat) < 1e-8 &&
        Math.abs(cur.lng() - position.lng) < 1e-8
      ) {
        return;
      }
      markerRef.current.setPosition(position);
      markerRef.current.setIcon(icon as google.maps.Icon | google.maps.Symbol | string | undefined);
      markerRef.current.setTitle(markerTitle);
      map.panTo(position);
    } else {
      const marker = new google.maps.Marker({
        map,
        position,
        draggable: true,
        title: markerTitle,
        icon: icon as google.maps.Icon | google.maps.Symbol | string | undefined,
      });
      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (p) onPositionChangeRef.current(p.lat(), p.lng());
      });
      markerRef.current = marker;
    }
  }, [lat, lng, pinColor, markerTitle]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      window.alert('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const la = position.coords.latitude;
        const ln = position.coords.longitude;
        placeMarkerAtRef.current({ lat: la, lng: ln }, true);
        mapRef.current?.setZoom(16);
        onPositionChange(la, ln);
      },
      (err) => {
        setLocating(false);
        let message = err.message || 'Could not get your location.';
        if (err.code === 1) {
          message =
            'Location permission denied. Allow location access for this site in your browser settings, then try again.';
        } else if (err.code === 2) {
          message = 'Location could not be determined. Check that location services are on.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Try again or move to an area with better GPS.';
        }
        window.alert(message);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  if (loadError === 'missing_key') {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-600">
        Add <code className="mx-1 rounded bg-gray-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
        <code className="mx-1 rounded bg-gray-200 px-1">.env.local</code> and enable the{' '}
        <span className="font-medium">Maps JavaScript API</span> for that key.
      </div>
    );
  }

  if (loadError === 'load_failed') {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 px-4 text-center text-sm text-red-800">
        Could not load Google Maps. In Google Cloud Console, enable the{' '}
        <span className="font-medium">Maps JavaScript API</span> for this API key, then refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1" role="search">
          <label htmlFor={searchInputId} className="mb-1 block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id={searchInputId}
            ref={searchInputRef}
            type="search"
            name={searchInputName}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={!mapSearchUnlocked}
            onFocus={() => setMapSearchUnlocked(true)}
            placeholder="e.g. Ayala Avenue Makati"
            disabled={loading || !mapReady}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
            data-lpignore="true"
            data-1p-ignore
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 lg:w-auto"
          disabled={loading || !mapReady || locating}
          onClick={handleUseCurrentLocation}
        >
          <Navigation className="w-4 h-4 mr-2 shrink-0" aria-hidden />
          {locating ? 'Getting location…' : 'Use current location'}
        </Button>
      </div>
      <div className="relative h-80 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 text-sm text-gray-600">
            Loading map…
          </div>
        )}
        <div ref={containerRef} className="h-full w-full min-h-[320px]" />
      </div>
    </div>
  );
}
