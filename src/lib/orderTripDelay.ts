import { supabase } from '@/src/lib/supabase';

/** Workflow statuses where a trip delay should surface on the order list. */
const DELAY_ELIGIBLE_ORDER_STATUSES = new Set([
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
  'Partially Fulfilled',
]);

const DELAY_EXCEPTION_TYPES = new Set([
  'Vehicle Breakdown',
  'Traffic',
  'Weather',
  'Customer Unavailable',
  'Wrong Address',
  'Stock Shortage',
  'Other',
]);

const OPEN_DELAY_STATUSES = ['Open', 'In Progress', 'Escalated'];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse delay type from `"Traffic: heavy congestion"` or a bare enum label. */
export function parseDelayTypeFromReason(reason: string): string {
  const text = reason.trim();
  if (!text) return 'Other';
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0) {
    const prefix = text.slice(0, colonIdx).trim();
    if (DELAY_EXCEPTION_TYPES.has(prefix)) return prefix;
  }
  if (DELAY_EXCEPTION_TYPES.has(text)) return text;
  return 'Other';
}

/**
 * List / filter label for an order: shows **Delayed** when the delivery is flagged
 * or the order is on an active delayed trip (workflow status unchanged in DB).
 */
export function orderListDisplayStatus(
  workflowStatus: string,
  deliveryStatus: string | null | undefined,
  onDelayedTrip: boolean,
): string {
  const st = String(workflowStatus ?? '').trim();
  if (
    deliveryStatus === 'Delayed' ||
    (onDelayedTrip && DELAY_ELIGIBLE_ORDER_STATUSES.has(st))
  ) {
    return 'Delayed';
  }
  return st || '—';
}

/** After a trip is marked delayed, flag linked orders for the orders list & filters. */
export async function markOrdersDelayedForTrip(orderIds: string[]): Promise<void> {
  const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: 'Delayed', updated_at: now })
    .in('id', ids);
  if (error) throw error;
}

/**
 * Create or refresh an open `delay_exceptions` row so logistics dashboards count the delay.
 * Reuses an existing open record for the same trip when present.
 */
export async function recordTripDelayException(params: {
  tripId: string;
  tripNumber: string;
  branchId: string | null;
  delayReason: string;
  owner?: string | null;
  orderNumbers?: string[];
  customerNames?: string[];
}): Promise<void> {
  const reason = params.delayReason.trim();
  if (!reason) return;

  const type = parseDelayTypeFromReason(reason);
  const today = isoDate(new Date());
  const orderNumbers = [...new Set((params.orderNumbers ?? []).map((n) => n.trim()).filter(Boolean))];
  const customerNames = [...new Set((params.customerNames ?? []).map((n) => n.trim()).filter(Boolean))];

  const { data: existing, error: lookupErr } = await supabase
    .from('delay_exceptions')
    .select('id')
    .eq('trip_id', params.tripId)
    .in('status', OPEN_DELAY_STATUSES)
    .order('reported_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupErr) {
    if (import.meta.env.DEV) console.warn('[delay] exception lookup failed:', lookupErr.message);
  }

  const payload = {
    type,
    affected_trip: params.tripNumber,
    trip_id: params.tripId,
    affected_orders: orderNumbers,
    customers_affected: customerNames,
    owner: params.owner?.trim() || null,
    reported_date: today,
    branch_id: params.branchId,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from('delay_exceptions').update(payload).eq('id', existing.id);
    if (error && import.meta.env.DEV) console.warn('[delay] exception update failed:', error.message);
    return;
  }

  const { error } = await supabase.from('delay_exceptions').insert({
    ...payload,
    days_late: 0,
    status: 'Open',
    resolution: null,
  });
  if (error && import.meta.env.DEV) console.warn('[delay] exception insert failed:', error.message);
}

/** Mark trip delayed, flag orders, and record a dashboard delay exception. */
export async function reportTripDelay(params: {
  tripId: string;
  tripNumber: string;
  branchId: string | null;
  delayReason: string;
  orderIds?: string[];
  orderNumbers?: string[];
  customerNames?: string[];
  owner?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const reason = params.delayReason.trim();
  if (!reason) return { ok: false, error: 'Please describe what happened.' };

  const now = new Date().toISOString();
  const { error: tripErr } = await supabase
    .from('trips')
    .update({
      status: 'Delayed',
      delay_reason: reason,
      updated_at: now,
    })
    .eq('id', params.tripId);

  if (tripErr) return { ok: false, error: tripErr.message };

  const orderIds = [...new Set((params.orderIds ?? []).map((id) => id.trim()).filter(Boolean))];
  if (orderIds.length) {
    try {
      await markOrdersDelayedForTrip(orderIds);
    } catch (ordErr) {
      if (import.meta.env.DEV) console.warn('[delay] could not flag orders delayed:', ordErr);
    }
  }

  await recordTripDelayException({
    tripId: params.tripId,
    tripNumber: params.tripNumber,
    branchId: params.branchId,
    delayReason: reason,
    owner: params.owner,
    orderNumbers: params.orderNumbers,
    customerNames: params.customerNames,
  });

  return { ok: true };
}

/** Collect order UUIDs assigned to delayed trips for a branch. */
export async function fetchDelayedTripOrderIdsForBranch(branchId: string): Promise<Set<string>> {
  const out = new Set<string>();
  const { data, error } = await supabase
    .from('trips')
    .select('order_ids')
    .eq('branch_id', branchId)
    .eq('status', 'Delayed');
  if (error) {
    if (import.meta.env.DEV) console.warn('[orders] delayed trip lookup failed:', error.message);
    return out;
  }
  for (const row of data ?? []) {
    for (const id of ((row as { order_ids?: string[] | null }).order_ids ?? [])) {
      if (id) out.add(String(id));
    }
  }
  return out;
}
