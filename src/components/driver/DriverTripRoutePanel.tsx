import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { RoutePlanningMap } from '@/src/components/maps/RoutePlanningMap';
import { fetchBranchDepotPinByBranchId } from '@/src/lib/companyAddressesSettings';
import { computeDrivingRoute } from '@/src/lib/routePlanning';
import { openGoogleMapsSearch } from '@/src/lib/maps';
import type { DriverOrderStop } from '@/src/lib/driverDashboard';

type Props = {
  branchId: string | null;
  tripNumber: string;
  stops: DriverOrderStop[];
  className?: string;
  /** When `all`, route includes every stop on the trip (for past / completed runs). */
  routeMode?: 'pending' | 'all';
};

export function DriverTripRoutePanel({
  branchId,
  tripNumber,
  stops,
  className = '',
  routeMode = 'pending',
}: Props): React.ReactElement {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeStops = useMemo(
    () => (routeMode === 'all' ? stops : stops.filter((s) => s.canDeliver)),
    [stops, routeMode],
  );

  const mapStops = useMemo(
    () =>
      routeStops
        .filter(
          (s) =>
            s.mapLat != null &&
            s.mapLng != null &&
            Number.isFinite(s.mapLat) &&
            Number.isFinite(s.mapLng),
        )
        .map((s) => ({
          lat: s.mapLat as number,
          lng: s.mapLng as number,
          orderId: s.id,
          title: `${s.orderNumber} — ${s.customerName}`,
        })),
    [routeStops],
  );

  const missingPinCount = routeStops.length - mapStops.length;

  useEffect(() => {
    let cancelled = false;
    if (!branchId) {
      setOrigin(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchBranchDepotPinByBranchId(branchId).then((pin) => {
      if (cancelled) return;
      setOrigin(pin);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    setDirectionsResult(null);
    setRouteMeta(null);
    setRouteError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!origin || mapStops.length === 0) return;

    debounceRef.current = setTimeout(() => {
      void computeDrivingRoute({
        origin,
        stops: mapStops.map((s) => ({ lat: s.lat, lng: s.lng, orderId: s.orderId })),
        optimizeWaypoints: mapStops.length > 1,
      }).then((res) => {
        if ('error' in res) {
          setDirectionsResult(null);
          setRouteMeta(null);
          setRouteError(res.error);
          return;
        }
        setDirectionsResult(res.route.directionsResult);
        setRouteMeta({
          distanceKm: res.route.totalDistanceKm,
          durationMinutes: res.route.totalDurationMinutes,
        });
        setRouteError(null);
      });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [origin, mapStops]);

  const openFullRoute = () => {
    const parts: string[] = [];
    if (origin) parts.push(`${origin.lat},${origin.lng}`);
    for (const s of mapStops) parts.push(`${s.lat},${s.lng}`);
    if (parts.length >= 2) {
      openGoogleMapsSearch(parts.join(' to '));
      return;
    }
    const first = routeStops[0];
    if (first?.deliveryAddress) openGoogleMapsSearch(first.deliveryAddress);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-blue-600" />
          Route — {tripNumber}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {routeMeta && (
            <span>
              ~{routeMeta.distanceKm.toFixed(1)} km · ~{routeMeta.durationMinutes} min drive
            </span>
          )}
          {(mapStops.length > 0 || routeStops.some((s) => s.deliveryAddress)) && (
            <button
              type="button"
              onClick={openFullRoute}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
            >
              Open in Maps
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-56 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading depot &amp; route…
        </div>
      ) : mapStops.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          <p className="font-medium">
            {routeMode === 'all' ? 'No map pins for this trip' : 'No map pins for pending stops'}
          </p>
          <p className="mt-1 text-amber-800/90">
            {routeStops.length === 0
              ? routeMode === 'all'
                ? 'This trip has no delivery stops on file.'
                : 'All deliveries on this trip are complete.'
              : `${routeStops.length} stop${routeStops.length === 1 ? '' : 's'} — use Navigate below, or ask logistics to set customer map pins.`}
          </p>
        </div>
      ) : (
        <>
          <RoutePlanningMap
            originLat={origin?.lat}
            originLng={origin?.lng}
            originTitle="Branch / depot"
            stops={mapStops}
            directionsResult={directionsResult}
            className="h-56 sm:h-64 w-full rounded-lg border border-gray-200 overflow-hidden"
          />
          {routeError && (
            <p className="text-xs text-amber-700">Could not compute driving route: {routeError}</p>
          )}
          {missingPinCount > 0 && (
            <p className="text-xs text-gray-500">
              {missingPinCount} stop{missingPinCount === 1 ? '' : 's'} without map coordinates — not shown on route.
            </p>
          )}
        </>
      )}

      {routeStops.length > 0 && (
        <ul className="space-y-1.5">
          {routeStops.map((stop, idx) => (
            <li
              key={stop.id}
              className="flex items-start justify-between gap-2 text-sm rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-gray-800">
                  {idx + 1}. {stop.orderNumber}
                </span>
                <span className="text-gray-500"> · {stop.customerName}</span>
                {stop.deliveryAddress && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {stop.deliveryAddress}
                  </p>
                )}
              </div>
              {(stop.deliveryAddress || (stop.mapLat != null && stop.mapLng != null)) && (
                <button
                  type="button"
                  onClick={() =>
                    openGoogleMapsSearch(
                      stop.mapLat != null && stop.mapLng != null
                        ? `${stop.mapLat},${stop.mapLng}`
                        : (stop.deliveryAddress ?? ''),
                    )
                  }
                  className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  Navigate
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
