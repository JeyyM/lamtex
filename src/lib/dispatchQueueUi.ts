/** Shared UI constants for Logistics dispatch queue and matching truck trip tables. */

import type { Trip } from '@/src/types/logistics';

export function normalizeDispatchSearchToken(value: string): string {
  return value.toLowerCase().replace(/[\s\-_#]/g, '');
}

/** Dispatch queue search — trip, driver, customer, destination, order #, or order UUID. */
export type DispatchSearchExtras = {
  orderMetaById?: Record<string, { orderNumber?: string }>;
  matchedOrderIds?: ReadonlySet<string>;
};

export function tripMatchesDispatchSearch(
  trip: Trip,
  query: string,
  extras?: DispatchSearchExtras,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qNorm = normalizeDispatchSearchToken(q);

  const matchText = (value: string | null | undefined): boolean => {
    if (!value?.trim()) return false;
    const lower = value.toLowerCase();
    if (lower.includes(q)) return true;
    if (qNorm.length >= 3 && normalizeDispatchSearchToken(value).includes(qNorm)) return true;
    return false;
  };

  if (matchText(trip.tripNumber)) return true;
  if (matchText(trip.driverName)) return true;
  if (matchText(trip.vehicleName)) return true;
  if (matchText(trip.plateNumber)) return true;
  if (matchText(trip.customerLabel)) return true;
  if (trip.destinations.some((d) => matchText(d))) return true;
  if (trip.customerNames?.some((n) => matchText(n))) return true;
  if (trip.orderNumbers?.some((n) => matchText(n))) return true;
  if (trip.orders.some((id) => matchText(id))) return true;

  if (extras?.orderMetaById) {
    for (const oid of trip.orders) {
      if (matchText(extras.orderMetaById[oid]?.orderNumber)) return true;
    }
  }
  if (extras?.matchedOrderIds?.size) {
    if (trip.orders.some((id) => extras.matchedOrderIds!.has(id))) return true;
  }

  return false;
}

export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DISPATCH_QUEUE_STATUS_OPTIONS = [
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Delayed',
  'Delivered',
  'Complete',
  'Cancelled',
] as const;

export const dispatchQueueStatusSelectClass =
  'w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500';

export function tripStatusDisplay(status: string): string {
  if (status === 'Complete' || status === 'Completed') return 'Completed';
  return status;
}

export function tripStatusIsCompletedUi(status: string): boolean {
  return status === 'Complete' || status === 'Completed';
}

/** Seeded colors for trip / vehicle chips (same algorithm as Logistics). */
export function getDispatchVehicleColor(vehicleId: string) {
  let seed = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    seed = seed * 31 + vehicleId.charCodeAt(i);
  }
  const random1 = Math.abs(Math.sin(seed) * 10000) % 1;
  const random2 = Math.abs(Math.sin(seed * 2) * 10000) % 1;
  const random3 = Math.abs(Math.sin(seed * 3) * 10000) % 1;
  const hue = Math.floor(random1 * 360);
  const saturation = 55 + Math.floor(random2 * 20);
  const lightness = 75 + Math.floor(random3 * 10);
  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    text: `hsl(${hue}, ${Math.min(saturation + 25, 95)}%, 25%)`,
    border: `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`,
  };
}

export function dispatchTableStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' {
  if (status === 'Complete' || status === 'Completed' || status === 'Delivered' || status === 'Available') return 'success';
  if (
    status === 'In Transit' ||
    status === 'Loading' ||
    status === 'Packed' ||
    status === 'Ready' ||
    status === 'Scheduled' ||
    status === 'On Trip'
  )
    return 'warning';
  if (status === 'Delayed' || status === 'Failed' || status === 'Blocked' || status === 'Maintenance' || status === 'Out of Service')
    return 'danger';
  if (status === 'Cancelled') return 'danger';
  return 'default';
}

/** Parse a trip's schedule into epoch ms — prefers ISO scheduledDate over localized display strings. */
export function tripScheduleSortMs(trip: Trip): number | null {
  const iso = (trip.scheduledDate ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const ms = Date.parse(`${iso}T12:00:00`);
    if (Number.isFinite(ms)) return ms;
  }

  const dep = trip.departureTime?.trim();
  if (dep) {
    const ms = Date.parse(dep);
    if (Number.isFinite(ms)) return ms;
  }

  if (trip.scheduledDate?.trim()) {
    const ms = Date.parse(trip.scheduledDate);
    if (Number.isFinite(ms)) return ms;
  }

  return null;
}

/** Compare two trips by schedule date/time (invalid/missing dates sort last). */
export function compareTripScheduleDates(a: Trip, b: Trip, dir: 'asc' | 'desc'): number {
  const ta = tripScheduleSortMs(a);
  const tb = tripScheduleSortMs(b);
  if (ta == null && tb == null) return 0;
  if (ta == null) return 1;
  if (tb == null) return -1;
  const diff = ta - tb;
  return dir === 'asc' ? diff : -diff;
}

/** Date-only label for dispatch tables (hides departure time until scheduling is time-precise). */
export function formatTripScheduleDate(trip: Trip): string {
  const iso = (trip.scheduledDate ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const dep = trip.departureTime?.trim();
  if (dep) {
    const commaIdx = dep.indexOf(',');
    if (commaIdx > 0) return dep.slice(0, commaIdx).trim();
    const ms = Date.parse(dep);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
    }
  }

  return trip.scheduledDate?.trim() || '—';
}
