/**
 * Truck Driver dashboard data layer.
 *
 * Drivers see only trips assigned to them (`driver_id` or legacy `driver_name`).
 * Their core workflows: view assigned trips, report delays, upload proof of delivery
 * (handled in TripDetailsModal / FulfillOrderModal).
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import { reportTripDelay } from '@/src/lib/orderTripDelay';
import type { Trip } from '@/src/types/logistics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  mapLat: number | null;
  mapLng: number | null;
  /** True when driver can upload proof / mark delivered from this stop. */
  canDeliver: boolean;
}

export interface DriverDeliveryLineItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderStatus: string | null;
  productName: string;
  variantDescription: string | null;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  quantityDelivered: number;
}

export interface DriverDashboardBundle {
  driverId: string | null;
  driverName: string | null;
  branchId: string | null;
  branchName: string | null;
  generatedAt: string;

  activeTrip: DriverTripSummary | null;
  /** Soonest trip that still has deliveries to complete. */
  nextTrip: DriverTripSummary | null;
  activeTrips: DriverTripSummary[];
  upcomingTrips: DriverTripSummary[];
  recentTrips: DriverTripSummary[];
  /** All completed / failed trips (newest first). */
  pastTrips: DriverTripSummary[];

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
const UPCOMING_TRIP_DB_STATUSES = new Set(['Pending', 'Planned', 'Scheduled']);

const TRIP_SELECT =
  'id, trip_number, status, scheduled_date, departure_time, eta, delay_reason, vehicle_id, vehicle_name, driver_id, driver_name, destinations, order_ids, capacity_used_percent, branch_id';

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

function mapTripRow(row: Record<string, unknown>, plateByVehicleId?: Map<string, string>): DriverTripSummary {
  const vehicleId = toStr(row.vehicle_id);
  const plate =
    vehicleId && plateByVehicleId?.get(vehicleId)
      ? plateByVehicleId.get(vehicleId)!
      : null;
  const dbStatus = toStr(row.status) ?? 'Planned';
  const orderIds = ((row.order_ids as string[] | null) ?? []).filter(Boolean);

  return {
    id: String(row.id),
    tripNumber: toStr(row.trip_number) ?? String(row.id),
    status: mapDbStatus(dbStatus),
    dbStatus,
    scheduledDate: toStr(row.scheduled_date)?.slice(0, 10) ?? null,
    departureTime: toStr(row.departure_time),
    eta: toStr(row.eta)?.slice(0, 10) ?? null,
    vehicleName: toStr(row.vehicle_name),
    plateNumber: plate,
    destinations: ((row.destinations as string[] | null) ?? []).filter(Boolean),
    orderIds,
    orderCount: orderIds.length,
    delayReason: toStr(row.delay_reason),
    capacityUsedPercent: toNumber(row.capacity_used_percent),
  };
}

async function loadPlateByVehicleId(vehicleIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(vehicleIds.filter(Boolean))];
  if (!ids.length) return map;
  const { data } = await supabase.from('vehicles').select('id, plate_number').in('id', ids);
  for (const row of data ?? []) {
    const id = toStr((row as Record<string, unknown>).id);
    const plate = toStr((row as Record<string, unknown>).plate_number);
    if (id && plate) map.set(id, plate);
  }
  return map;
}

function tripMatchesDriver(row: Record<string, unknown>, driverId: string, driverName: string): boolean {
  const did = toStr(row.driver_id);
  if (did && did === driverId) return true;
  return driverNamesMatch(toStr(row.driver_name), driverName);
}

async function resolveDriverProfile(opts: {
  driverId: string | null;
  driverName: string | null;
  sessionEmail?: string | null;
}): Promise<{ driverId: string | null; driverName: string | null; employeeBranchId: string | null }> {
  let driverId = opts.driverId?.trim() || null;
  let driverName = opts.driverName?.trim() || null;
  let employeeBranchId: string | null = null;

  if (driverId) {
    const { data } = await supabase
      .from('employees')
      .select('id, employee_name, branch_id')
      .eq('id', driverId)
      .maybeSingle();
    if (data) {
      driverName = driverName || toStr((data as Record<string, unknown>).employee_name);
      employeeBranchId = toStr((data as Record<string, unknown>).branch_id);
    }
    return { driverId, driverName, employeeBranchId };
  }

  const email = opts.sessionEmail?.trim();
  if (email) {
    const { data } = await supabase
      .from('employees')
      .select('id, employee_name, branch_id')
      .eq('email', email)
      .maybeSingle();
    if (data) {
      driverId = toStr((data as Record<string, unknown>).id);
      driverName = driverName || toStr((data as Record<string, unknown>).employee_name);
      employeeBranchId = toStr((data as Record<string, unknown>).branch_id);
    }
  }

  return { driverId, driverName, employeeBranchId };
}

async function fetchDriverTripRows(opts: {
  driverId: string;
  driverName: string;
  branchId: string | null;
}): Promise<DriverTripSummary[]> {
  const name = opts.driverName.trim();

  const { data: byId, error: idErr } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .eq('driver_id', opts.driverId)
    .order('scheduled_date', { ascending: true });
  if (idErr) throw idErr;

  let rows = (byId ?? []) as Array<Record<string, unknown>>;

  if (!rows.length && name) {
    const { data: byName, error: nameErr } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .eq('driver_name', name)
      .order('scheduled_date', { ascending: true });
    if (nameErr) throw nameErr;
    rows = (byName ?? []) as Array<Record<string, unknown>>;
  }

  if (opts.branchId) {
    rows = rows.filter((r) => {
      const bid = toStr(r.branch_id);
      return !bid || bid === opts.branchId;
    });
  }

  rows = rows.filter((r) => tripMatchesDriver(r, opts.driverId, name));

  const vehicleIds = rows.map((r) => toStr(r.vehicle_id)).filter((id): id is string => Boolean(id));
  const plateByVehicleId = await loadPlateByVehicleId(vehicleIds);

  return rows.map((r) => mapTripRow(r, plateByVehicleId));
}

function pickNextUndeliveredTrip(trips: DriverTripSummary[], today: string): DriverTripSummary | null {
  const isTerminal = (t: DriverTripSummary) => TERMINAL_DB_STATUSES.includes(t.dbStatus);

  const candidates = trips.filter((t) => !isTerminal(t));
  if (candidates.length === 0) return null;

  const priority = (t: DriverTripSummary): number => {
    if (t.dbStatus === 'In Transit') return 0;
    if (t.dbStatus === 'Delayed') return 1;
    if (t.dbStatus === 'Loading') return 2;
    if (t.scheduledDate && t.scheduledDate <= today) return 3;
    return 4;
  };

  candidates.sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    const da = a.scheduledDate ?? '9999-12-31';
    const db = b.scheduledDate ?? '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return (a.departureTime ?? '').localeCompare(b.departureTime ?? '');
  });

  return candidates[0] ?? null;
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
    const coordsByCustomer = new Map<string, { lat: number; lng: number }>();
    if (customerIds.length) {
      const { data: custRows } = await supabase
        .from('customers')
        .select('id, phone, map_lat, map_lng')
        .in('id', customerIds);
      for (const c of custRows ?? []) {
        const row = c as Record<string, unknown>;
        const phone = toStr(row.phone);
        if (phone) phoneByCustomer.set(String(row.id), phone);
        const lat = row.map_lat != null ? Number(row.map_lat) : NaN;
        const lng = row.map_lng != null ? Number(row.map_lng) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          coordsByCustomer.set(String(row.id), { lat, lng });
        }
      }
    }

    const stops: DriverOrderStop[] = [];
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const id = String(r.id);
      const trip = tripByOrder.get(id);
      if (!trip) continue;
      const status = toStr(r.status) ?? '—';
      const custId = toStr(r.customer_id);
      const coords = custId ? coordsByCustomer.get(custId) : undefined;
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
        mapLat: coords?.lat ?? null,
        mapLng: coords?.lng ?? null,
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

// ---------------------------------------------------------------------------
// Public fetch
// ---------------------------------------------------------------------------

export async function fetchDriverDashboard(opts: {
  driverId: string | null;
  driverName: string | null;
  branchName: string | null;
  sessionEmail?: string | null;
}): Promise<DriverDashboardBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const topbarBranchId = branchName ? await resolveBranchIdByName(branchName) : null;

  const profile = await resolveDriverProfile({
    driverId: opts.driverId,
    driverName: opts.driverName,
    sessionEmail: opts.sessionEmail,
  });
  const driverId = profile.driverId;
  const driverName = profile.driverName;
  const branchId = topbarBranchId ?? profile.employeeBranchId;

  if (!driverId && !driverName) {
    return {
      driverId: null,
      driverName: null,
      branchId,
      branchName,
      generatedAt: new Date().toISOString(),
      activeTrip: null,
      nextTrip: null,
      activeTrips: [],
      upcomingTrips: [],
      recentTrips: [],
      pastTrips: [],
      orderStops: [],
      pendingDeliveryCount: 0,
    };
  }

  let allTrips: DriverTripSummary[] = [];
  try {
    if (driverId) {
      allTrips = await fetchDriverTripRows({
        driverId,
        driverName: driverName ?? '',
        branchId,
      });
    } else if (driverName) {
      const { data, error } = await supabase
        .from('trips')
        .select(TRIP_SELECT)
        .ilike('driver_name', driverName)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      let rows = (data ?? []) as Array<Record<string, unknown>>;
      if (branchId) {
        rows = rows.filter((r) => {
          const bid = toStr(r.branch_id);
          return !bid || bid === branchId;
        });
      }
      const vehicleIds = rows.map((r) => toStr(r.vehicle_id)).filter((id): id is string => Boolean(id));
      const plateByVehicleId = await loadPlateByVehicleId(vehicleIds);
      allTrips = rows.map((r) => mapTripRow(r, plateByVehicleId));
    }
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
    if (t.scheduledDate && t.scheduledDate > today) return true;
    return UPCOMING_TRIP_DB_STATUSES.has(t.dbStatus) && !t.scheduledDate;
  });

  const recentTrips = allTrips
    .filter((t) => (t.dbStatus === 'Completed' || t.dbStatus === 'Failed') && t.scheduledDate && t.scheduledDate >= weekAgo)
    .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''))
    .slice(0, 8);

  const pastTrips = allTrips
    .filter((t) => t.dbStatus === 'Completed' || t.dbStatus === 'Failed')
    .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''));

  const nextTrip = pickNextUndeliveredTrip(allTrips, today);
  const activeTrip = nextTrip;

  const tripsForStops = new Map<string, DriverTripSummary>();
  for (const t of workingTrips) tripsForStops.set(t.id, t);
  for (const t of upcomingTrips) tripsForStops.set(t.id, t);
  for (const t of pastTrips) tripsForStops.set(t.id, t);
  if (nextTrip) tripsForStops.set(nextTrip.id, nextTrip);

  const orderStops = await fetchOrderStops([...tripsForStops.values()]);
  const pendingDeliveryCount = orderStops.filter((s) => s.canDeliver).length;

  return {
    driverId,
    driverName,
    branchId,
    branchName,
    generatedAt: new Date().toISOString(),
    activeTrip,
    nextTrip,
    activeTrips: workingTrips,
    upcomingTrips,
    recentTrips,
    pastTrips,
    orderStops,
    pendingDeliveryCount,
  };
}

/** Line items for orders on a trip (driver delivery manifest). */
export async function fetchDriverTripLineItems(orderIds: string[]): Promise<DriverDeliveryLineItem[]> {
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (!ids.length) return [];

  const mapRows = (data: unknown): DriverDeliveryLineItem[] => {
    const items: DriverDeliveryLineItem[] = [];
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const orderRaw = r.orders;
      const orderRow = (
        Array.isArray(orderRaw) ? orderRaw[0] : orderRaw
      ) as Record<string, unknown> | null | undefined;

      const variantRaw = r.product_variants;
      const variantRow = (
        Array.isArray(variantRaw) ? variantRaw[0] : variantRaw
      ) as Record<string, unknown> | null | undefined;
      const productRaw = variantRow?.products;
      const productRow = (
        Array.isArray(productRaw) ? productRaw[0] : productRaw
      ) as Record<string, unknown> | null | undefined;

      items.push({
        id: String(r.id),
        orderId: String(r.order_id),
        orderNumber: toStr(orderRow?.order_number) ?? String(r.order_id),
        customerName: toStr(orderRow?.customer_name) ?? '—',
        orderStatus: toStr(orderRow?.status),
        productName: toStr(r.product_name) ?? '—',
        variantDescription: toStr(r.variant_description),
        sku: toStr(r.sku),
        imageUrl: toStr(productRow?.image_url),
        quantity: toNumber(r.quantity),
        quantityDelivered: toNumber(r.quantity_delivered),
      });
    }

    items.sort((a, b) => {
      if (a.orderNumber !== b.orderNumber) return a.orderNumber.localeCompare(b.orderNumber);
      return a.productName.localeCompare(b.productName);
    });
    return items;
  };

  try {
    const { data, error } = await supabase
      .from('order_line_items')
      .select(
        'id, order_id, sku, product_name, variant_description, quantity, quantity_delivered, variant_id, orders ( order_number, customer_name, status ), product_variants ( products ( image_url ) )',
      )
      .in('order_id', ids);
    if (error) throw error;
    return mapRows(data);
  } catch (e) {
    logDev('trip line items (with images)', e);
    try {
      const { data, error } = await supabase
        .from('order_line_items')
        .select(
          'id, order_id, sku, product_name, variant_description, quantity, quantity_delivered, orders ( order_number, customer_name, status )',
        )
        .in('order_id', ids);
      if (error) throw error;
      return mapRows(data);
    } catch (fallbackErr) {
      logDev('trip line items', fallbackErr);
      return [];
    }
  }
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
  orderIds?: string[];
  orderNumbers?: string[];
  customerNames?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const text = params.explanation.trim();
  if (!text) return { ok: false, error: 'Please describe what happened.' };

  const fullReason = params.delayType === 'Other' ? text : `${params.delayType}: ${text}`;

  return reportTripDelay({
    tripId: params.tripId,
    tripNumber: params.tripNumber,
    branchId: params.branchId,
    delayReason: fullReason,
    orderIds: params.orderIds,
    orderNumbers: params.orderNumbers,
    customerNames: params.customerNames,
    owner: params.driverName,
  });
}

/** Reload a single trip as the full Trip type (for TripDetailsModal). */
export async function fetchDriverTripDetail(tripId: string): Promise<{ trip: Trip | null; error?: string }> {
  const { fetchTripById } = await import('@/src/lib/logisticsScheduling');
  return fetchTripById(tripId);
}
