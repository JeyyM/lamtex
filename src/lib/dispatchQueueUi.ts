/** Shared UI constants for Logistics dispatch queue and matching truck trip tables. */

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
