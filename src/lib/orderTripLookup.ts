import { supabase } from '@/src/lib/supabase';

export type OrderTripInfo = {
  tripId: string;
  tripNumber: string;
};

type TripCandidate = OrderTripInfo & { scheduled: string; status: string };

const OVERLAP_CHUNK = 40;

function shouldReplaceTrip(current: TripCandidate | undefined, candidate: TripCandidate): boolean {
  if (!current) return true;
  if (candidate.scheduled > current.scheduled) return true;
  if (candidate.scheduled < current.scheduled) return false;
  if (current.status === 'Cancelled' && candidate.status !== 'Cancelled') return true;
  return false;
}

/** Map order UUID → assigned trip (prefers latest scheduled_date). */
export async function fetchTripNumbersByOrderIds(
  orderIds: string[],
): Promise<Map<string, OrderTripInfo>> {
  const unique = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, OrderTripInfo>();
  if (unique.length === 0) return out;

  const best = new Map<string, TripCandidate>();

  for (let i = 0; i < unique.length; i += OVERLAP_CHUNK) {
    const chunk = unique.slice(i, i + OVERLAP_CHUNK);
    const { data, error } = await supabase
      .from('trips')
      .select('id, trip_number, status, scheduled_date, order_ids')
      .overlaps('order_ids', chunk);

    if (error) {
      if (import.meta.env.DEV) console.warn('[orderTripLookup]', error.message);
      continue;
    }

    for (const row of data ?? []) {
      const tripId = String(row.id ?? '');
      if (!tripId) continue;
      const tripNumber = String(row.trip_number ?? '').trim() || tripId.slice(0, 8);
      const scheduled = String(row.scheduled_date ?? '').slice(0, 10);
      const status = String(row.status ?? '');
      const oids = ((row.order_ids ?? []) as string[]).filter(Boolean);

      for (const oid of oids) {
        if (!unique.includes(oid)) continue;
        const candidate: TripCandidate = { tripId, tripNumber, scheduled, status };
        const prev = best.get(oid);
        if (shouldReplaceTrip(prev, candidate)) {
          best.set(oid, candidate);
        }
      }
    }
  }

  for (const [oid, trip] of best) {
    out.set(oid, { tripId: trip.tripId, tripNumber: trip.tripNumber });
  }

  return out;
}

export async function attachTripInfoByOrderId<T extends { orderId: string }>(
  rows: T[],
): Promise<(T & { tripId: string | null; tripNumber: string | null })[]> {
  const map = await fetchTripNumbersByOrderIds(rows.map((r) => r.orderId));
  return rows.map((row) => {
    const trip = map.get(row.orderId);
    return { ...row, tripId: trip?.tripId ?? null, tripNumber: trip?.tripNumber ?? null };
  });
}

export async function attachTripInfoById<T extends { id: string }>(
  rows: T[],
): Promise<(T & { tripId: string | null; tripNumber: string | null })[]> {
  const map = await fetchTripNumbersByOrderIds(rows.map((r) => r.id));
  return rows.map((row) => {
    const trip = map.get(row.id);
    return { ...row, tripId: trip?.tripId ?? null, tripNumber: trip?.tripNumber ?? null };
  });
}
