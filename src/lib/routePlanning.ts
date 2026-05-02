/**
 * Google Maps Directions-based route planning.
 *
 * Uses `google.maps.DirectionsService` (Maps JavaScript API) to compute:
 *  - Real driving distance (km) and duration (minutes) for each leg
 *  - Optionally reorder waypoints to minimise total travel (Google TSP solver)
 *
 * Requires `VITE_GOOGLE_MAPS_API_KEY` with the Maps JavaScript API enabled.
 * The Directions API is billed as part of the Maps JS SDK when called client-side.
 *
 * Limit: Google allows up to 25 waypoints per request. If more stops are
 * selected we fall back to a placeholder estimate.
 */

import { loadGoogleMapsJs } from './maps';

export type RouteLeg = {
  /** Driving distance for this leg in km. */
  distanceKm: number;
  /** Driving time for this leg in minutes. */
  durationMinutes: number;
};

export type RouteResult = {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  /**
   * Optimized visit order — indices into the original `stops[]` array.
   * e.g. [2, 0, 1] means visit stop 2 first, then 0, then 1.
   * Empty when `optimizeWaypoints` was false or only 1 stop.
   */
  waypointOrder: number[];
  /** Per-leg breakdown (origin→stop1, stop1→stop2, …, stopN-1→stopN). */
  legs: RouteLeg[];
  /** Raw Directions API result — pass to RoutePlanningMap for road polyline. */
  directionsResult: google.maps.DirectionsResult;
};

export type ComputeRouteInput = {
  origin: { lat: number; lng: number };
  /** At least one stop required. Max 25. */
  stops: { lat: number; lng: number; orderId: string }[];
  /** Let Google reorder waypoints for shortest total distance (default: true). */
  optimizeWaypoints?: boolean;
};

export type ComputeRouteOutput =
  | { ok: true; route: RouteResult }
  | { ok: false; error: string };

/**
 * Compute a real driving route via Google Maps DirectionsService.
 *
 * - Origin  = depot / branch location
 * - Stops   = selected delivery addresses (must have lat/lng map pins set)
 * - Returns road distance, drive time, and the optimized stop order
 */
export async function computeDrivingRoute(
  params: ComputeRouteInput,
): Promise<ComputeRouteOutput> {
  const { origin, stops, optimizeWaypoints = true } = params;

  if (stops.length === 0) {
    return { ok: false, error: 'No stops provided.' };
  }

  try {
    await loadGoogleMapsJs();
  } catch {
    return { ok: false, error: 'Google Maps JavaScript API is not available.' };
  }

  const svc = new google.maps.DirectionsService();

  // DirectionsService: origin + destination are required; middle stops are waypoints.
  // With a single stop: origin → destination, no waypoints.
  const destination = stops[stops.length - 1];
  const waypoints: google.maps.DirectionsWaypoint[] = stops.slice(0, -1).map((s) => ({
    location: new google.maps.LatLng(s.lat, s.lng),
    stopover: true,
  }));

  return new Promise<ComputeRouteOutput>((resolve) => {
    svc.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints,
        optimizeWaypoints: optimizeWaypoints && stops.length > 1,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'PH', // bias to Philippines
      },
      (result, status) => {
        if (
          status !== google.maps.DirectionsStatus.OK ||
          !result ||
          !result.routes[0]
        ) {
          resolve({
            ok: false,
            error: `Directions API returned status: ${status}`,
          });
          return;
        }

        const routeLegs = result.routes[0].legs ?? [];
        const legs: RouteLeg[] = routeLegs.map((l) => ({
          distanceKm: (l.distance?.value ?? 0) / 1000,
          durationMinutes: Math.ceil((l.duration?.value ?? 0) / 60),
        }));

        const totalDistanceKm = legs.reduce((s, l) => s + l.distanceKm, 0);
        const totalDurationMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);
        // Google returns optimized waypoint indices (0-based into the waypoints array,
        // which is stops[0..n-2]; the last stop is always the destination).
        const waypointOrder: number[] = result.routes[0].waypoint_order ?? [];

        resolve({
          ok: true,
          route: {
            totalDistanceKm,
            totalDurationMinutes,
            waypointOrder,
            legs,
            directionsResult: result,
          },
        });
      },
    );
  });
}

/** Fuel cost estimate for Philippine trucks: ₱25 per km (diesel ~10L/100km @ ₱65/L + overhead). */
export const FUEL_COST_PER_KM_PHP = 25;

/** Format minutes → "Xh Ym" string (e.g. 95 → "1h 35m"). */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
