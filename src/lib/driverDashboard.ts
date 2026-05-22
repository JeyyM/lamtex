/**
 * Truck Driver dashboard data layer.
 *
 * Drivers see only trips assigned to them (`driver_id` or legacy `driver_name`).
 * Their core workflows: view assigned trips, report delays, upload proof of delivery
 * (handled in TripDetailsModal / FulfillOrderModal), and status notifications (future).
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import type { Trip } from '@/src/types/logistics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriverKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
}

export interface DriverTripSummary {
  id: string;
  tripNumber: string;
  status: string;
  dbStatus: string;
  scheduledDate: string | null;
  departureTime: string | null;
  eta: string | null;
  vehicleName: string | null;
  plateNumber: string | null;
  destinations: string[];
  orderIds: string[];
  orderCount: number;
  delayReason: string | null;
  capacityUsedPercent: number;
}

export interface DriverOrderStop {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string | null;
  requiredDate: string | null;
  status: string;
  tripId: string;
  tripNumber: string;
  phone: string | null;
  /** True when driver can upload proof / mark delivered from this stop. */
  canDeliver: boolean;
}

export interface DriverDashboardBundle {
  driverId: string | null;
  driverName: string | null;
  branchId: string | null;
  branchName: string | null;
  generatedAt: string;
  kpis: DriverKPI[];

  activeTrip: DriverTripSummary | null;
  activeTrips: DriverTripSummary[];
  upcomingTrips: DriverTripSummary[];
  recentTrips: DriverTripSummary[];

  orderStops: DriverOrderStop[];
  pendingDeliveryCount: number;
}

export type DriverDelayType =
  | 'Traffic'
  | 'Vehicle Breakdown'
  | 'Weather'
  | 'Customer Unavailable'
  | 'Wrong Address'
  | 'Stock Shortage'
  | 'Other';

export const DRIVER_DELAY_TYPES: DriverDelayType[] = [
  'Traffic',
  'Vehicle Breakdown',
  'Weather',
  'Customer Unavailable',
  'Wrong Address',
  'Stock Shortage',
  'Other',
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMINAL_DB_STATUSES = ['Completed', 'Failed'];
const DELIVERABLE_ORDER_STATUSES = new Set(['Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit']);

const TRIP_SELECT = `
  id, trip_number, status, scheduled_date, departure_time, eta, delay_reason,
  vehicle_id, vehicle_name, driver_id, driver_name, destinations, order_ids,
  capacity_used_percent,
  vehicles ( plate_number )
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number') return String(v);
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mapDbStatus(s: string): string {
  if (s === 'Planned' || s === 'Pending') return 'Scheduled';
  if (s === 'Completed') return 'Complete';
  if (s === 'Failed') return 'Cancelled';
  return s;
}

function driverNamesMatch(stored: string | null | undefined, expected: string): boolean {
  const a = (stored ?? '').trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  return Boolean(a && b && a === b);
}

function logDev(scope: string, err: unknown): void {
  if (import.meta.env.DEV) console.warn(`[driver dashboard] ${scope}`, err);
}

function mapTripRow(row: Record<string, unknown>): DriverTripSummary {
  const plate =
    row.vehicles && typeof row.vehicles === 'object'
      ? toStr(
          Array.isArray(row.vehicles)
            ? (row.vehicles[0] as { plate_number?: unknown } | undefined)?.plate_number
            : (row.vehicles as { plate_number?: unknown }).plate_number,
        )
      : null;
  const dbStatus = toStr(row.status) ?? 'Planned';
  const orderIds = ((row.order_ids as string[] | null) ?? []).filter(Boolean);

  return {
    id: String(row.id),
    tripNumber: toStr(row.trip_number) ?? String(row.id),
    status: mapDbStatus(dbStatus),
    dbStatus,
    scheduledDate: toStr(row.scheduled_date),
    departureTime: toStr(row.departure_time),
    eta: toStr(row.eta),
    vehicleName: toStr(row.vehicle_name),
    plateNumber: plate,
    destinations: ((row.destinations as string[] | null) ?? []).filter(Boolean),
    orderIds,
    orderCount: orderIds.length,
    delayReason: toStr(row.delay_reason),
    capacityUsedPercent: toNumber(row.capacity_used_percent),
  };
}

function tripMatchesDriver(row: Record<string, unknown>, driverId: string, driverName: string): boolean {
  const did = toStr(row.driver_id);
  if (did && did === driverId) return true;
  return driverNamesMatch(toStr(row.driver_name), driverName);
}

async function fetchDriverTripRows(opts: {
  driverId: string;
  driverName: string;
  branchId: string | null;
}): Promise<DriverTripSummary[]> {
  let q = supabase.from('trips').select(TRIP_SELECT).order('scheduled_date', { ascending: true });

  if (opts.branchId) q = q.eq('branch_id', opts.branchId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((r) =>
    tripMatchesDriver(r, opts.driverId, opts.driverName),
  );

  return rows.map(mapTripRow);
}

async function fetchOrderStops(trips: DriverTripSummary[]): Promise<DriverOrderStop[]> {
  const tripByOrder = new Map<string, DriverTripSummary>();
  const allOrderIds: string[] = [];
  for (const t of trips) {
    for (const oid of t.orderIds) {
      if (!oid || tripByOrder.has(oid)) continue;
      tripByOrder.set(oid, t);
      allOrderIds.push(oid);
    }
  }
  if (allOrderIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, customer_name, customer_id, delivery_address, required_date, status',
      )
      .in('id', allOrderIds);
    if (error) throw error;

    const customerIds = [
      ...new Set(
        (data ?? [])
          .map((r) => toStr((r as Record<string, unknown>).customer_id))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const phoneByCustomer = new Map<string, string>();
    if (customerIds.length) {
      const { data: custRows } = await supabase.from('customers').select('id, phone').in('id', customerIds);
      for (const c of custRows ?? []) {
        const phone = toStr((c as Record<string, unknown>).phone);
        if (phone) phoneByCustomer.set(String(c.id), phone);
      }
    }

    const stops: DriverOrderStop[] = [];
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const id = String(r.id);
      const trip = tripByOrder.get(id);
      if (!trip) continue;
      const status = toStr(r.status) ?? '—';
      const custId = toStr(r.customer_id);
      stops.push({
        id,
        orderNumber: toStr(r.order_number) ?? id,
        customerName: toStr(r.customer_name) ?? '—',
        deliveryAddress: toStr(r.delivery_address),
        requiredDate: toStr(r.required_date),
        status,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        phone: custId ? phoneByCustomer.get(custId) ?? null : null,
        canDeliver: DELIVERABLE_ORDER_STATUSES.has(status),
      });
    }

    stops.sort((a, b) => {
      const ta = tripByOrder.get(a.id)?.scheduledDate ?? '';
      const tb = tripByOrder.get(b.id)?.scheduledDate ?? '';
      if (ta !== tb) return ta.localeCompare(tb);
      return a.orderNumber.localeCompare(b.orderNumber);
    });
    return stops;
  } catch (e) {
    logDev('order stops', e);
    return [];
  }
}

function buildKpis(opts: {
  activeCount: number;
  pendingDeliveries: number;
  upcomingCount: number;
  completedWeek: number;
  delayedCount: number;
}): DriverKPI[] {
  return [
    {
      id: 'kpi-active',
      label: 'Active trips',
      value: opts.activeCount.toString(),
      subtitle: opts.activeCount > 0 ? 'In progress now' : 'Nothing active',
      status: opts.activeCount > 0 ? 'warning' : 'good',
    },
    {
      id: 'kpi-deliveries',
      label: 'Stops left',
      value: opts.pendingDeliveries.toString(),
      subtitle: 'Orders still to deliver',
      status: opts.pendingDeliveries > 0 ? 'warning' : 'good',
    },
    {
      id: 'kpi-upcoming',
      label: 'Upcoming',
      value: opts.upcomingCount.toString(),
      subtitle: 'Scheduled ahead',
      status: opts.upcomingCount > 0 ? 'neutral' : 'good',
    },
    {
      id: 'kpi-week',
      label: 'Completed (7d)',
      value: opts.completedWeek.toString(),
      subtitle: 'Trips finished this week',
      status: 'good',
    },
    {
      id: 'kpi-delayed',
      label: 'Delayed',
      value: opts.delayedCount.toString(),
      subtitle: opts.delayedCount > 0 ? 'Needs attention' : 'On schedule',
      status: opts.delayedCount > 0 ? 'danger' : 'good',
    },
  ];
}

// ---------------------------------------------------------------------------
// Public fetch
// ---------------------------------------------------------------------------

export async function fetchDriverDashboard(opts: {
  driverId: string | null;
  driverName: string | null;
  branchName: string | null;
}): Promise<DriverDashboardBundle> {
  const driverId = opts.driverId?.trim() || null;
  const driverName = opts.driverName?.trim() || null;
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;

  if (!driverId) {
    return {
      driverId,
      driverName,
      branchId,
      branchName,
      generatedAt: new Date().toISOString(),
      kpis: buildKpis({ activeCount: 0, pendingDeliveries: 0, upcomingCount: 0, completedWeek: 0, delayedCount: 0 }),
      activeTrip: null,
      activeTrips: [],
      upcomingTrips: [],
      recentTrips: [],
      orderStops: [],
      pendingDeliveryCount: 0,
    };
  }

  let allTrips: DriverTripSummary[] = [];
  try {
    allTrips = await fetchDriverTripRows({
      driverId,
      driverName: driverName ?? '',
      branchId,
    });
  } catch (e) {
    logDev('trips', e);
  }

  const today = isoDate(new Date());
  const weekAgo = isoDate(new Date(Date.now() - 6 * 86_400_000));

  const isTerminal = (t: DriverTripSummary) => TERMINAL_DB_STATUSES.includes(t.dbStatus);
  const isMoving = (t: DriverTripSummary) => ['Loading', 'In Transit', 'Delayed'].includes(t.dbStatus);

  const workingTrips = allTrips.filter((t) => {
    if (isTerminal(t)) return false;
    if (isMoving(t)) return true;
    return Boolean(t.scheduledDate && t.scheduledDate <= today);
  });

  const upcomingTrips = allTrips.filter((t) => {
    if (isTerminal(t) || isMoving(t)) return false;
    return Boolean(t.scheduledDate && t.scheduledDate > today);
  });

  const recentTrips = allTrips
    .filter((t) => (t.dbStatus === 'Completed' || t.dbStatus === 'Failed') && t.scheduledDate && t.scheduledDate >= weekAgo)
    .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''))
    .slice(0, 8);

  const activeTrip =
    workingTrips.find((t) => isMoving(t)) ?? workingTrips[0] ?? null;

  const orderStops = await fetchOrderStops(workingTrips);
  const pendingDeliveryCount = orderStops.filter((s) => s.canDeliver).length;

  const completedWeek = allTrips.filter(
    (t) => t.dbStatus === 'Completed' && t.scheduledDate && t.scheduledDate >= weekAgo,
  ).length;

  const delayedCount = workingTrips.filter((t) => t.dbStatus === 'Delayed').length;

  const kpis = buildKpis({
    activeCount: workingTrips.length,
    pendingDeliveries: pendingDeliveryCount,
    upcomingCount: upcomingTrips.length,
    completedWeek,
    delayedCount,
  });

  return {
    driverId,
    driverName,
    branchId,
    branchName,
    generatedAt: new Date().toISOString(),
    kpis,
    activeTrip,
    activeTrips: workingTrips,
    upcomingTrips,
    recentTrips,
    orderStops,
    pendingDeliveryCount,
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Report a delay on the driver's trip — updates trip + creates delay_exception for logistics. */
export async function reportDriverTripDelay(params: {
  tripId: string;
  tripNumber: string;
  branchId: string | null;
  driverName: string;
  delayType: DriverDelayType;
  explanation: string;
  orderNumbers?: string[];
  customerNames?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const text = params.explanation.trim();
  if (!text) return { ok: false, error: 'Please describe what happened.' };

  const now = new Date().toISOString();
  const fullReason = params.delayType === 'Other' ? text : `${params.delayType}: ${text}`;

  const { error: tripErr } = await supabase
    .from('trips')
    .update({
      status: 'Delayed',
      delay_reason: fullReason,
      updated_at: now,
    })
    .eq('id', params.tripId);

  if (tripErr) return { ok: false, error: tripErr.message };

  const today = isoDate(new Date());
  const { error: delayErr } = await supabase.from('delay_exceptions').insert({
    type: params.delayType,
    affected_trip: params.tripNumber,
    trip_id: params.tripId,
    affected_orders: params.orderNumbers ?? [],
    customers_affected: params.customerNames ?? [],
    days_late: 0,
    owner: params.driverName,
    status: 'Open',
    reported_date: today,
    branch_id: params.branchId,
    resolution: null,
  });

  if (delayErr) {
    // Trip is already marked delayed; log but don't fail the driver action.
    logDev('delay_exceptions insert', delayErr);
  }

  return { ok: true };
}

/** Reload a single trip as the full Trip type (for TripDetailsModal). */
export async function fetchDriverTripDetail(tripId: string): Promise<{ trip: Trip | null; error?: string }> {
  const { fetchTripById } = await import('@/src/lib/logisticsScheduling');
  return fetchTripById(tripId);
}
