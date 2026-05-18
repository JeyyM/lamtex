import React, { useEffect, useRef, useState } from 'react';
import { Navigation } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import {
  getAdvancedMarkerLatLng,
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  importMapsMarkerLibrary,
  loadGoogleMapsJs,
  type AdvancedMarkerLike,
} from '@/src/lib/maps';
import { blueCustomerPinImgElement } from '@/src/lib/customerMapPinIcon';

/** Default center (Metro Manila) when no pin is set yet. */
const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

export type CompanyMapPickerPinColor = 'default' | 'blue';

function mainMarkerContent(pinColor: CompanyMapPickerPinColor | undefined): HTMLElement | undefined {
  if (pinColor !== 'blue') return undefined;
  return blueCustomerPinImgElement();
}

/** Place object from Places API (New) — @types/google.maps lags this surface. */
type NewPlaceInstance = {
  fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
  location?: google.maps.LatLng | google.maps.LatLngLiteral | null;
  viewport?: google.maps.LatLngBounds | null;
};

type PlacesAutocompleteLib = {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken: unknown;
      includedRegionCodes: string[];
      locationBias?: google.maps.LatLngBounds;
    }) => Promise<{
      suggestions?: Array<{
        placePrediction?: {
          text: { text: string };
          toPlace: () => NewPlaceInstance;
        };
      }>;
    }>;
  };
};

type SuggestionRow = {
  label: string;
  placePrediction: {
    text: { text: string };
    toPlace: () => NewPlaceInstance;
  };
};

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

type AdvancedMarkerCtor = new (opts: Record<string, unknown>) => AdvancedMarkerLike;

function readLatLng(loc: google.maps.LatLng | google.maps.LatLngLiteral): { la: number; ln: number } {
  if (loc && typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { la: ll.lat(), ln: ll.lng() };
  }
  const lit = loc as google.maps.LatLngLiteral;
  return { la: lit.lat, ln: lit.lng };
}

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<AdvancedMarkerLike | null>(null);
  const referenceMarkerRef = useRef<AdvancedMarkerLike | null>(null);
  const advancedMarkerCtorRef = useRef<AdvancedMarkerCtor | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const placeMarkerAtRef = useRef<(position: google.maps.LatLngLiteral, pan: boolean) => void>(() => {});

  const sessionTokenRef = useRef<unknown>(null);
  const suggestRequestIdRef = useRef(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [loadError, setLoadError] = useState<'missing_key' | 'load_failed' | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);

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

    const placeMarker = (position: google.maps.LatLngLiteral, pan: boolean) => {
      const map = mapRef.current;
      const Adv = advancedMarkerCtorRef.current;
      if (!map || !Adv) return;
      const content = mainMarkerContent(pinColor);
      if (markerRef.current) {
        markerRef.current.position = position;
        markerRef.current.content = content ?? undefined;
        markerRef.current.title = markerTitle;
      } else {
        const marker = new Adv({
          map,
          position,
          gmpDraggable: true,
          title: markerTitle,
          ...(content ? { content } : {}),
        });
        marker.addListener('dragend', () => {
          const p = getAdvancedMarkerLatLng(marker);
          if (p) onPositionChangeRef.current(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
      if (pan) {
        map.panTo(position);
      }
    };

    void loadGoogleMapsJs()
      .then(async () => {
        if (cancelled || !containerRef.current) return;
        const { AdvancedMarkerElement } = await importMapsMarkerLibrary();
        advancedMarkerCtorRef.current = AdvancedMarkerElement;
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
          mapId: getGoogleMapsMapId(),
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
      sessionTokenRef.current = null;
      suggestRequestIdRef.current += 1;

      const m = markerRef.current;
      if (m) m.map = null;
      markerRef.current = null;
      const rm = referenceMarkerRef.current;
      if (rm) rm.map = null;
      referenceMarkerRef.current = null;
      advancedMarkerCtorRef.current = null;
      mapRef.current = null;
      if (el) el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lat/lng sync in next effect; referencePin synced below
  }, [pinColor, markerTitle, referencePin?.lat, referencePin?.lng]);

  /** Session token for Places autocomplete billing; renewed after each place selection. */
  useEffect(() => {
    if (!mapReady || typeof google.maps.importLibrary !== 'function') return;
    let cancelled = false;
    void google.maps.importLibrary('places').then((lib) => {
      if (cancelled) return;
      const { AutocompleteSessionToken } = lib as unknown as PlacesAutocompleteLib;
      sessionTokenRef.current = new AutocompleteSessionToken();
    });
    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || loadError) return;
    const q = searchText.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchOpen(false);
      setSuggestBusy(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        const map = mapRef.current;
        if (!map || typeof google.maps.importLibrary !== 'function') return;
        const reqId = ++suggestRequestIdRef.current;
        setSuggestBusy(true);
        try {
          const { AutocompleteSuggestion, AutocompleteSessionToken } =
            (await google.maps.importLibrary('places')) as unknown as PlacesAutocompleteLib;
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new AutocompleteSessionToken();
          }
          const bias = map.getBounds() ?? undefined;
          const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: sessionTokenRef.current,
            includedRegionCodes: ['ph'],
            ...(bias ? { locationBias: bias } : {}),
          });
          if (reqId !== suggestRequestIdRef.current) return;
          const preds = (raw ?? [])
            .map((s) => s.placePrediction)
            .filter(
              (p): p is NonNullable<typeof p> =>
                Boolean(p && typeof p.toPlace === 'function' && p.text?.text),
            );
          const rows: SuggestionRow[] = preds.map((p) => ({
            label: p.text.text,
            placePrediction: p,
          }));
          setSuggestions(rows);
          setSearchOpen(rows.length > 0);
        } catch {
          if (reqId !== suggestRequestIdRef.current) return;
          setSuggestions([]);
          setSearchOpen(false);
        } finally {
          if (reqId === suggestRequestIdRef.current) setSuggestBusy(false);
        }
      })();
    }, 280);
    return () => clearTimeout(handle);
  }, [searchText, mapReady, loadError]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDoc = (e: MouseEvent) => {
      const w = searchWrapRef.current;
      if (w && !w.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [searchOpen]);

  useEffect(() => {
    const map = mapRef.current;
    const Adv = advancedMarkerCtorRef.current;
    if (!map || !mapReady || !Adv) return;
    const ref = referencePin;
    if (!ref || !Number.isFinite(ref.lat) || !Number.isFinite(ref.lng)) {
      if (referenceMarkerRef.current) {
        referenceMarkerRef.current.map = null;
        referenceMarkerRef.current = null;
      }
      return;
    }
    const pos = { lat: ref.lat, lng: ref.lng };
    const title = ref.title?.trim() || 'Store / HQ';
    if (referenceMarkerRef.current) {
      referenceMarkerRef.current.position = pos;
      referenceMarkerRef.current.title = title;
    } else {
      referenceMarkerRef.current = new Adv({
        map,
        position: pos,
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
    const Adv = advancedMarkerCtorRef.current;
    if (!map || !mapReady || !Adv) return;
    const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasPin) {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      return;
    }

    const position = { lat: lat as number, lng: lng as number };
    const content = mainMarkerContent(pinColor);
    if (markerRef.current) {
      const cur = getAdvancedMarkerLatLng(markerRef.current);
      const samePos =
        cur &&
        Math.abs(cur.lat - position.lat) < 1e-8 &&
        Math.abs(cur.lng - position.lng) < 1e-8;
      if (samePos) {
        markerRef.current.content = content ?? undefined;
        markerRef.current.title = markerTitle;
        return;
      }
      markerRef.current.position = position;
      markerRef.current.content = content ?? undefined;
      markerRef.current.title = markerTitle;
      map.panTo(position);
    } else {
      const marker = new Adv({
        map,
        position,
        gmpDraggable: true,
        title: markerTitle,
        ...(content ? { content } : {}),
      });
      marker.addListener('dragend', () => {
        const p = getAdvancedMarkerLatLng(marker);
        if (p) onPositionChangeRef.current(p.lat, p.lng);
      });
      markerRef.current = marker;
    }
  }, [lat, lng, pinColor, markerTitle, mapReady]);

  const searchListboxId = `${searchInputId}-listbox`;

  const handlePickSuggestion = async (row: SuggestionRow) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const place = row.placePrediction.toPlace();
      await place.fetchFields({ fields: ['location', 'viewport'] });
      const loc = place.location;
      if (!loc) return;
      const { la, ln } = readLatLng(loc);
      placeMarkerAtRef.current({ lat: la, lng: ln }, true);
      const vp = place.viewport;
      if (vp) {
        map.fitBounds(vp);
      } else {
        map.setCenter({ lat: la, lng: ln });
        map.setZoom(16);
      }
      onPositionChangeRef.current(la, ln);
      setSearchText(row.label);
      setSuggestions([]);
      setSearchOpen(false);
      if (typeof google.maps.importLibrary === 'function') {
        const { AutocompleteSessionToken } =
          (await google.maps.importLibrary('places')) as unknown as PlacesAutocompleteLib;
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
    } catch {
      /* Places fetch failed — ignore */
    }
  };

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
        <div className="company-map-picker-search min-w-0 flex-1" role="search">
          <label htmlFor={searchInputId} className="mb-1 block text-sm font-medium text-gray-700">
            Search
          </label>
          <div
            ref={searchWrapRef}
            className="company-map-picker-search-host relative w-full min-h-[42px] rounded-lg border border-gray-300 bg-white text-gray-900 [color-scheme:light] focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
          >
            <input
              id={searchInputId}
              name={searchInputName}
              type="search"
              autoComplete="off"
              placeholder="e.g. Ayala Avenue Makati"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls={searchListboxId}
              role="combobox"
              disabled={loading || !mapReady}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="company-map-picker-search-input h-[42px] w-full rounded-lg border-0 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-500 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            {suggestBusy && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                …
              </span>
            )}
            {searchOpen && suggestions.length > 0 && (
              <ul
                id={searchListboxId}
                role="listbox"
                className="company-map-picker-suggestions absolute left-0 right-0 top-full z-[10001] mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
              >
                {suggestions.map((row, idx) => (
                  <li key={`${row.label}-${idx}`} role="option">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handlePickSuggestion(row)}
                    >
                      {row.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
