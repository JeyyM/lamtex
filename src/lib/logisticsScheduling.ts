/**
 * Logistics scheduling: orders ready for route planning, branch trips, trip creation.
 * **Approved** and **Partially Fulfilled** orders (not on an active trip) appear for scheduling.
 */
import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import { fetchBranchDepotPinByBranchName } from '@/src/lib/companyAddressesSettings';
import type { OrderReadyForDispatch, Trip, DriverOption } from '@/src/types/logistics';

const QUEUE_STATUSES = ['Approved', 'Partially Fulfilled'] as const;
/** Safe subset when `Partially Fulfilled` is not yet on `order_status` enum. */
const QUEUE_STATUSES_CORE = ['Approved'] as const;

/** DB `trip_status` values that still reserve orders on a vehicle/shipment calendar. */
const ACTIVE_TRIP_DB_STATUSES = ['Pending', 'Planned', 'Loading', 'In Transit', 'Delayed'] as const;

/** Trips that still "hold" assigned orders — app-facing statuses after `mapDbTripStatus`. */
const ACTIVE_TRIP_STATUSES = ['Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delayed'] as const;

/**
 * `trips.logistics_notes` requires `database/trips_logistics_notes.sql` on the project.
 * If the column is missing, PostgREST returns 400; we retry without it so dispatch still loads.
 */
let tripsLogisticsNotesColumnAvailable = true;

function isMissingLogisticsNotesColumnError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? '').toLowerCase();
  return m.includes('logistics_notes') || (m.includes('column') && m.includes('does not exist'));
}

function isMissingColumnError(err: { message?: string } | null | undefined, column: string): boolean {
  const m = (err?.message ?? '').toLowerCase();
  const col = column.toLowerCase();
  return m.includes(col) && (m.includes('column') || m.includes('does not exist'));
}

function isInvalidEnumValueError(err: { message?: string } | null | undefined, value: string): boolean {
  const m = (err?.message ?? '').toLowerCase();
  const v = value.toLowerCase();
  return (m.includes('invalid input value') || m.includes('invalid enum')) && m.includes(v);
}

function isActiveTripStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim();
  if (!s) return false;
  return (
    (ACTIVE_TRIP_DB_STATUSES as readonly string[]).includes(s) ||
    (ACTIVE_TRIP_STATUSES as readonly string[]).includes(s)
  );
}

const ORDER_QUEUE_SELECT_FULL =
  'id, order_number, customer_id, customer_name, required_date, delivery_address, delivery_type, urgency, volume_cbm, weight_kg, status';

const ORDER_QUEUE_SELECT_NO_DELIVERY_TYPE =
  'id, order_number, customer_id, customer_name, required_date, delivery_address, urgency, volume_cbm, weight_kg, status';

const ORDER_QUEUE_SELECT_MINIMAL =
  'id, order_number, customer_id, customer_name, required_date, delivery_address, volume_cbm, weight_kg, status';

async function fetchOrderRowsForQueue(bid: string): Promise<{
  rows: Record<string, unknown>[];
  error?: string;
}> {
  const run = (select: string, statuses: readonly string[]) =>
    supabase.from('orders').select(select).eq('branch_id', bid).in('status', [...statuses]);

  let select = ORDER_QUEUE_SELECT_FULL;
  let { data, error } = await run(select, QUEUE_STATUSES);

  if (error && isInvalidEnumValueError(error, 'Partially Fulfilled')) {
    if (import.meta.env.DEV) {
      console.warn('[logistics] order_status Partially Fulfilled missing — querying Approved only.');
    }
    ({ data, error } = await run(select, QUEUE_STATUSES_CORE));
  }

  if (error && isMissingColumnError(error, 'delivery_type')) {
    if (import.meta.env.DEV) {
      console.warn('[logistics] orders.delivery_type missing — retrying queue fetch without it.');
    }
    select = ORDER_QUEUE_SELECT_NO_DELIVERY_TYPE;
    ({ data, error } = await run(select, QUEUE_STATUSES));
    if (error && isInvalidEnumValueError(error, 'Partially Fulfilled')) {
      ({ data, error } = await run(select, QUEUE_STATUSES_CORE));
    }
  }

  if (error && isMissingColumnError(error, 'urgency')) {
    if (import.meta.env.DEV) {
      console.warn('[logistics] orders.urgency missing — retrying queue fetch without it.');
    }
    select = ORDER_QUEUE_SELECT_MINIMAL;
    ({ data, error } = await run(select, QUEUE_STATUSES));
    if (error && isInvalidEnumValueError(error, 'Partially Fulfilled')) {
      ({ data, error } = await run(select, QUEUE_STATUSES_CORE));
    }
  }

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as Record<string, unknown>[] };
}

/** Branch trip list select — base columns without optional `logistics_notes`. */
const TRIP_BRANCH_LIST_SELECT_BASE =
  'id, trip_number, vehicle_id, vehicle_name, driver_id, driver_name, status, scheduled_date, departure_time, destinations, order_ids, capacity_used_percent, weight_used_kg, volume_used_cbm, max_weight_kg, max_volume_cbm, eta, actual_arrival, delay_reason';

const TRIP_BRANCH_LIST_SELECT_FULL = `${TRIP_BRANCH_LIST_SELECT_BASE}, logistics_notes`;

/** Single-trip fetch (detail modals) — without / with `logistics_notes`. */
const TRIP_DETAIL_ROW_SELECT_MIN =
  'id, trip_number, vehicle_id, vehicle_name, driver_id, driver_name, status, scheduled_date, departure_time, destinations, order_ids, capacity_used_percent, weight_used_kg, volume_used_cbm, max_weight_kg, max_volume_cbm, eta, actual_arrival, delay_reason, branches ( name )';

const TRIP_DETAIL_ROW_SELECT_FULL =
  'id, trip_number, vehicle_id, vehicle_name, driver_id, driver_name, status, scheduled_date, departure_time, destinations, order_ids, capacity_used_percent, weight_used_kg, volume_used_cbm, max_weight_kg, max_volume_cbm, eta, actual_arrival, delay_reason, logistics_notes, branches ( name )';

function tripDetailSelect(): string {
  return tripsLogisticsNotesColumnAvailable ? TRIP_DETAIL_ROW_SELECT_FULL : TRIP_DETAIL_ROW_SELECT_MIN;
}

function tripBranchListSelect(): string {
  return tripsLogisticsNotesColumnAvailable ? TRIP_BRANCH_LIST_SELECT_FULL : TRIP_BRANCH_LIST_SELECT_BASE;
}

function num(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : fallback;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return String(d).slice(0, 10);
}

/** Attach customer / order-number labels from linked orders for dispatch search + columns. */
async function enrichTripsWithOrderCustomers(trips: Trip[]): Promise<Trip[]> {
  const allOrderIds = [...new Set(trips.flatMap((t) => t.orders))];
  if (!allOrderIds.length) return trips;

  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('id, customer_name, order_number')
    .in('id', allOrderIds);
  if (error || !orderRows?.length) return trips;

  const byId = new Map(
    orderRows.map((r) => [
      r.id as string,
      { customer_name: (r.customer_name as string | null) ?? '', order_number: (r.order_number as string | null) ?? '' },
    ]),
  );

  return trips.map((trip) => {
    const names: string[] = [];
    const orderNums: string[] = [];
    for (const oid of trip.orders) {
      const row = byId.get(oid);
      if (!row) continue;
      if (row.customer_name.trim()) names.push(row.customer_name.trim());
      if (row.order_number.trim()) orderNums.push(row.order_number.trim());
    }
    const uniqueNames = [...new Set(names)];
    let customerLabel = '—';
    if (uniqueNames.length === 1) customerLabel = uniqueNames[0]!;
    else if (uniqueNames.length > 1) customerLabel = `${uniqueNames[0]} +${uniqueNames.length - 1}`;

    return {
      ...trip,
      customerNames: uniqueNames,
      customerLabel,
      orderNumbers: orderNums,
    };
  });
}

function mapDbTripStatus(s: string): Trip['status'] {
  const allowed: Trip['status'][] = [
    'Scheduled',
    'Loading',
    'Packed',
    'Ready',
    'In Transit',
    'Delayed',
    'Delivered',
    'Cancelled',
    'Complete',
  ];
  // Accept legacy DB values and map to new app-facing statuses
  if (s === 'Planned' || s === 'Pending') return 'Scheduled';
  if (s === 'Completed') return 'Complete';
  if (s === 'Failed') return 'Cancelled';
  return (allowed.includes(s as Trip['status']) ? s : 'Scheduled') as Trip['status'];
}

/** Tailwind classes for trip status chips (warehouse trip rows, loading modal). */
export function tripStatusBadgeClass(status: string): string {
  const s = String(status ?? '').trim();
  switch (s) {
    case 'Delayed':
      return 'bg-red-100 text-red-900 border-red-400 ring-1 ring-red-200/80';
    case 'Failed':
      return 'bg-red-100 text-red-950 border-red-500 ring-1 ring-red-200/80';
    case 'In Transit':
      return 'bg-blue-100 text-blue-900 border-blue-400';
    case 'Loading':
      return 'bg-orange-100 text-orange-950 border-orange-400';
    case 'Planned':
    case 'Pending':
    case 'Scheduled':
      return 'bg-slate-100 text-slate-800 border-slate-400';
    case 'Completed':
    case 'Complete':
    case 'Delivered':
      return 'bg-emerald-100 text-emerald-900 border-emerald-400';
    default:
      return 'bg-amber-50 text-amber-950 border-amber-300';
  }
}

/** Reverse of mapDbTripStatus: converts app-facing status to the DB enum value. */
function toDbTripStatus(s: string): string {
  // DB enum: 'Pending' | 'Planned' | 'Loading' | 'In Transit' | 'Completed' | 'Delayed' | 'Failed'
  if (s === 'Scheduled') return 'Planned';
  if (s === 'Complete') return 'Completed';
  if (s === 'Packed' || s === 'Ready') return 'Loading';
  if (s === 'Delivered') return 'Completed';
  if (s === 'Cancelled') return 'Failed';
  return s;
}

/** Branch depot / HQ pin from company addresses (fallback: company_settings HQ columns). */
export async function fetchBranchHqCoords(branchName: string): Promise<{ lat: number; lng: number } | null> {
  return fetchBranchDepotPinByBranchName(branchName.trim());
}

function promiseWithTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function orderMatchesVehicleKind(
  deliveryType: string | null | undefined,
  vehicleKind?: 'truck' | 'container',
): boolean {
  if (vehicleKind === 'container') return deliveryType === 'Ship';
  if (vehicleKind === 'truck') return deliveryType !== 'Ship';
  return true;
}

async function loadBranchTripRows(bid: string): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  let { data, error } = await supabase
    .from('trips')
    .select(tripBranchListSelect())
    .eq('branch_id', bid)
    .order('scheduled_date', { ascending: true });

  if (error && tripsLogisticsNotesColumnAvailable && isMissingLogisticsNotesColumnError(error)) {
    tripsLogisticsNotesColumnAvailable = false;
    if (import.meta.env.DEV) {
      console.warn('[logistics] trips.logistics_notes missing — retrying trip fetch without it.');
    }
    const retry = await supabase
      .from('trips')
      .select(tripBranchListSelect())
      .eq('branch_id', bid)
      .order('scheduled_date', { ascending: true });
    data = retry.data;
    error = retry.error;
  }

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as Record<string, unknown>[] };
}

async function loadVehicleMeta(vehicleIds: string[]): Promise<{
  typeById: Map<string, string>;
  plateById: Map<string, string>;
}> {
  const typeById = new Map<string, string>();
  const plateById = new Map<string, string>();
  if (!vehicleIds.length) return { typeById, plateById };

  const { data: vrows } = await supabase
    .from('vehicles')
    .select('id, type, plate_number')
    .in('id', vehicleIds);

  for (const v of vrows ?? []) {
    const id = v.id as string;
    typeById.set(id, (v.type as string) ?? '');
    const plate = (v.plate_number as string | null | undefined)?.trim();
    if (plate) plateById.set(id, plate);
  }
  return { typeById, plateById };
}

function tripBlocksQueue(
  trip: { status?: string | null; vehicle_id?: string | null },
  typeById: Map<string, string>,
  vehicleKind?: 'truck' | 'container',
): boolean {
  if (!isActiveTripStatus(trip.status ?? undefined)) return false;
  const vType = trip.vehicle_id ? typeById.get(trip.vehicle_id as string) : null;
  if (vehicleKind === 'container') return vType === 'Shipping Container';
  if (vehicleKind === 'truck') return !vType || vType !== 'Shipping Container';
  return true;
}

async function buildOrderQueueFromRows(
  branchName: string,
  tripRows: Record<string, unknown>[],
  typeById: Map<string, string>,
  orderRows: Record<string, unknown>[],
  vehicleKind?: 'truck' | 'container',
): Promise<{ orders: OrderReadyForDispatch[]; error?: string }> {
  const assigned = new Set<string>();
  for (const t of tripRows) {
    if (!tripBlocksQueue(t as { status?: string | null; vehicle_id?: string | null }, typeById, vehicleKind)) {
      continue;
    }
    const ids = ((t.order_ids ?? []) as string[]).filter(Boolean);
    ids.forEach((id) => assigned.add(id));
  }

  const filteredOrders = orderRows.filter((o) =>
    orderMatchesVehicleKind((o as { delivery_type?: string | null }).delivery_type, vehicleKind),
  );

  const customerIds = [
    ...new Set(
      filteredOrders
        .map((o) => (o as { customer_id?: string | null }).customer_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const coordsByCustomerId = new Map<string, { lat: number; lng: number }>();
  if (customerIds.length) {
    const { data: custRows, error: custErr } = await supabase
      .from('customers')
      .select('id, map_lat, map_lng')
      .in('id', customerIds);
    if (custErr) {
      if (import.meta.env.DEV) console.warn('[logistics] customer map coords fetch failed:', custErr.message);
    } else {
      for (const c of custRows ?? []) {
        const lat = c.map_lat != null ? Number(c.map_lat) : NaN;
        const lng = c.map_lng != null ? Number(c.map_lng) : NaN;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          coordsByCustomerId.set(c.id as string, { lat, lng });
        }
      }
    }
  }

  const partialIds = filteredOrders
    .filter((o) => String((o as { status?: string }).status ?? '').trim() === 'Partially Fulfilled')
    .map((o) => o.id as string);

  const remainderByOrder = new Map<string, { ordered: number; remaining: number }>();
  if (partialIds.length) {
    const { data: lineRows, error: lineErr } = await supabase
      .from('order_line_items')
      .select('order_id, quantity, quantity_delivered')
      .in('order_id', partialIds);
    if (lineErr) {
      if (import.meta.env.DEV) console.warn('[logistics] partial order line fetch failed:', lineErr.message);
    } else {
      for (const row of lineRows ?? []) {
        const oid = row.order_id as string;
        const q = Math.max(0, num(row.quantity, 0));
        const d = Math.max(0, num(row.quantity_delivered, 0));
        const cur = remainderByOrder.get(oid) ?? { ordered: 0, remaining: 0 };
        cur.ordered += q;
        cur.remaining += Math.max(0, q - d);
        remainderByOrder.set(oid, cur);
      }
    }
  }

  const out: OrderReadyForDispatch[] = [];
  for (const o of filteredOrders) {
    if (assigned.has(o.id as string)) continue;
    const dest =
      (o.delivery_address && String(o.delivery_address).split(/[\n,]/)[0]?.trim()?.slice(0, 120)) ||
      (o.customer_name as string) ||
      '—';
    const urgRaw = (o.urgency as string) || 'Medium';
    const urg: 'High' | 'Medium' | 'Low' =
      urgRaw === 'High' || urgRaw === 'Critical' ? 'High' : urgRaw === 'Low' ? 'Low' : 'Medium';
    const custId = (o.customer_id as string | null) ?? null;
    const coords = custId ? coordsByCustomerId.get(custId) : undefined;

    const st = String((o as { status?: string }).status ?? '').trim();
    let volume = Math.max(0.01, num(o.volume_cbm, 0.05));
    let weight = Math.max(1, num(o.weight_kg, 10));
    let notes: string | undefined;

    if (st === 'Partially Fulfilled') {
      const rem = remainderByOrder.get(o.id as string);
      if (!rem || rem.remaining <= 0 || rem.ordered <= 0) continue;
      const scale = Math.min(1, rem.remaining / rem.ordered);
      volume = Math.max(0.01, volume * scale);
      weight = Math.max(1, weight * scale);
      notes = `Partial: ${rem.remaining} of ${rem.ordered} units still to deliver`;
    }

    out.push({
      id: o.id as string,
      orderNumber: o.order_number as string,
      customer: (o.customer_name as string) ?? '—',
      customerId: custId,
      mapLat: coords?.lat ?? null,
      mapLng: coords?.lng ?? null,
      branch: branchName,
      destination: dest,
      requiredDate: fmtDate(o.required_date as string | null),
      volume,
      weight,
      notes,
      urgency: urg,
      priority: urg === 'High' ? 1 : urg === 'Low' ? 3 : 2,
    });
  }
  return { orders: out };
}

function mapTripRowToTrip(
  row: Record<string, unknown>,
  branchName: string,
  plateById: Map<string, string>,
): Trip {
  const vehicleUuid = (row.vehicle_id as string) ?? '';
  const orderIds = ((row.order_ids ?? []) as string[]).filter(Boolean);
  const dest = (row.destinations as string[] | null) ?? [];
  const dep = row.departure_time as string | null;
  const eta = row.eta as string | null;
  const arr = row.actual_arrival as string | null;
  return {
    id: row.id as string,
    tripNumber: row.trip_number as string,
    vehicleId: vehicleUuid,
    vehicleName: (row.vehicle_name as string) ?? '—',
    driverId: (row.driver_id as string | null) ?? null,
    driverName: (row.driver_name as string) ?? '—',
    status: mapDbTripStatus((row.status as string) ?? 'Scheduled'),
    scheduledDate: fmtDate(row.scheduled_date as string),
    departureTime: dep
      ? new Date(dep).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : undefined,
    destinations: dest.length ? dest : ['—'],
    orders: orderIds,
    capacityUsed: num(row.capacity_used_percent, 0),
    weightUsed: num(row.weight_used_kg, 0),
    volumeUsed: num(row.volume_used_cbm, 0),
    maxWeight: num(row.max_weight_kg, 5000),
    maxVolume: num(row.max_volume_cbm, 25),
    plateNumber: vehicleUuid ? plateById.get(vehicleUuid) ?? null : null,
    eta: eta ? fmtDate(eta) : undefined,
    actualArrival: arr
      ? new Date(arr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : undefined,
    delayReason: (row.delay_reason as string) ?? undefined,
    logisticsNotes: (row.logistics_notes as string) ?? undefined,
    branch: branchName,
  };
}

async function mapTripRowsToBranchTrips(
  tripRows: Record<string, unknown>[],
  plateById: Map<string, string>,
  typeById: Map<string, string>,
  branchName: string,
  vehicleKind: 'truck' | 'container',
): Promise<Trip[]> {
  const wantType = vehicleKind === 'container' ? 'Shipping Container' : 'Truck';
  const mapped = tripRows
    .filter((row) => {
      const vehicleUuid = (row.vehicle_id as string) ?? '';
      if (!vehicleUuid) return vehicleKind === 'truck';
      return typeById.get(vehicleUuid) === wantType;
    })
    .map((row) => mapTripRowToTrip(row, branchName, plateById));

  return enrichTripsWithOrderCustomers(mapped);
}

/** Single round-trip for Logistics page: shared trips query + order queue (avoids duplicate fetches/timeouts). */
export async function fetchLogisticsPageData(
  branchName: string,
  vehicleKind: 'truck' | 'container' = 'truck',
): Promise<{
  orders: OrderReadyForDispatch[];
  trips: Trip[];
  ordersError?: string;
  tripsError?: string;
}> {
  try {
    const bid = await resolveBranchIdByName(branchName.trim());
    if (!bid) {
      const msg = 'Branch not found';
      return { orders: [], trips: [], ordersError: msg, tripsError: msg };
    }

    const [tripLoad, orderFetch] = await Promise.all([
      loadBranchTripRows(bid),
      fetchOrderRowsForQueue(bid),
    ]);

    const vehicleIds = [
      ...new Set(
        tripLoad.rows
          .map((r) => r.vehicle_id as string | null | undefined)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];
    const { typeById, plateById } = await loadVehicleMeta(vehicleIds);

    let orders: OrderReadyForDispatch[] = [];
    let ordersError = orderFetch.error;
    if (!orderFetch.error) {
      const built = await buildOrderQueueFromRows(
        branchName,
        tripLoad.rows,
        typeById,
        orderFetch.rows,
        vehicleKind,
      );
      orders = built.orders;
    }

    let trips: Trip[] = [];
    let tripsError = tripLoad.error;
    if (!tripLoad.error) {
      trips = await mapTripRowsToBranchTrips(
        tripLoad.rows,
        plateById,
        typeById,
        branchName,
        vehicleKind,
      );
    }

    return { orders, trips, ordersError, tripsError };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load logistics data.';
    return { orders: [], trips: [], ordersError: message, tripsError: message };
  }
}

/** Orders eligible for new trip assignment: Approved or Partially Fulfilled, not already on an active trip. */
export async function fetchLogisticsOrderQueue(
  branchName: string,
  opts?: { vehicleKind?: 'truck' | 'container' },
): Promise<{
  orders: OrderReadyForDispatch[];
  error?: string;
}> {
  try {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { orders: [], error: 'Branch not found' };

  const [{ rows: tripRows, error: tripErr }, orderFetch] = await Promise.all([
    supabase
      .from('trips')
      .select('order_ids, status, vehicle_id')
      .eq('branch_id', bid)
      .then(({ data, error }) => ({
        rows: (data ?? []) as Record<string, unknown>[],
        error: error?.message,
      })),
    fetchOrderRowsForQueue(bid),
  ]);

  if (tripErr) return { orders: [], error: tripErr };
  if (orderFetch.error) return { orders: [], error: orderFetch.error };

  const vehicleIds = [
    ...new Set(
      tripRows
        .map((t) => t.vehicle_id as string | null | undefined)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const { typeById } = await loadVehicleMeta(vehicleIds);
  return buildOrderQueueFromRows(
    branchName,
    tripRows,
    typeById,
    orderFetch.rows,
    opts?.vehicleKind,
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load order queue.';
    return { orders: [], error: message };
  }
}

/** Trips for dispatch calendar and conflict checks. Optionally filter by truck vs shipping container fleet. */
export async function fetchTripsForBranch(
  branchName: string,
  vehicleKind: 'truck' | 'container' = 'truck',
): Promise<{ trips: Trip[]; error?: string }> {
  try {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { trips: [], error: 'Branch not found' };

  const { rows: tripRows, error } = await loadBranchTripRows(bid);
  if (error) return { trips: [], error };

  const vehicleIds = [
    ...new Set(
      tripRows
        .map((r) => r.vehicle_id as string | null | undefined)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const { typeById, plateById } = await loadVehicleMeta(vehicleIds);
  const trips = await mapTripRowsToBranchTrips(tripRows, plateById, typeById, branchName, vehicleKind);
  return { trips };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load trips.';
    return { trips: [], error: message };
  }
}

async function tripRowRecordToTrip(r: Record<string, unknown>): Promise<Trip> {
  const vehicleUuid = (r.vehicle_id as string) ?? '';
  let plate: string | null = null;
  if (vehicleUuid) {
    const { data: vrow } = await supabase.from('vehicles').select('plate_number').eq('id', vehicleUuid).maybeSingle();
    plate = (vrow?.plate_number as string | null | undefined)?.trim() || null;
  }

  const brRaw = r.branches as { name?: string } | { name?: string }[] | null;
  const branchName = Array.isArray(brRaw) ? (brRaw[0]?.name ?? '') : (brRaw?.name ?? '');

  const orderIds = ((r.order_ids ?? []) as string[]).filter(Boolean);
  const dest = (r.destinations as string[] | null) ?? [];
  const dep = r.departure_time as string | null;
  const eta = r.eta as string | null;
  const arr = r.actual_arrival as string | null;

  return {
    id: r.id as string,
    tripNumber: r.trip_number as string,
    vehicleId: vehicleUuid,
    vehicleName: (r.vehicle_name as string) ?? '—',
    driverId: (r.driver_id as string | null) ?? null,
    driverName: (r.driver_name as string) ?? '—',
    status: mapDbTripStatus((r.status as string) ?? 'Scheduled'),
    scheduledDate: fmtDate(r.scheduled_date as string),
    departureTime: dep
      ? new Date(dep).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : undefined,
    destinations: dest.length ? dest : ['—'],
    orders: orderIds,
    capacityUsed: num(r.capacity_used_percent, 0),
    weightUsed: num(r.weight_used_kg, 0),
    volumeUsed: num(r.volume_used_cbm, 0),
    maxWeight: num(r.max_weight_kg, 5000),
    maxVolume: num(r.max_volume_cbm, 25),
    plateNumber: plate,
    eta: eta ? fmtDate(eta) : undefined,
    actualArrival: arr
      ? new Date(arr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : undefined,
    delayReason: (r.delay_reason as string) ?? undefined,
    logisticsNotes: (r.logistics_notes as string) ?? undefined,
    branch: branchName,
  };
}

/** Load one trip by primary key for detail modals (e.g. truck trip history). */
export async function fetchTripById(tripId: string): Promise<{ trip: Trip | null; error?: string }> {
  const id = tripId.trim();
  if (!id) return { trip: null };

  let { data: row, error } = await supabase.from('trips').select(tripDetailSelect()).eq('id', id).maybeSingle();

  if (error && tripsLogisticsNotesColumnAvailable && isMissingLogisticsNotesColumnError(error)) {
    tripsLogisticsNotesColumnAvailable = false;
    console.warn(
      '[logistics] trips.logistics_notes missing — run database/trips_logistics_notes.sql. Retrying trip fetch without it.',
    );
    const retry = await supabase.from('trips').select(tripDetailSelect()).eq('id', id).maybeSingle();
    row = retry.data;
    error = retry.error;
  }

  if (error) return { trip: null, error: error.message };
  if (!row) return { trip: null };

  return { trip: await tripRowRecordToTrip(row as unknown as Record<string, unknown>) };
}

/**
 * Resolve a live `trips` row when `trip_history.trip_id` was never stored (e.g. legacy snapshots).
 * Picks the latest matching row by scheduled date for this vehicle + trip number.
 */
export async function fetchTripForVehicleByTripNumber(
  vehicleUuid: string,
  tripNumber: string,
): Promise<{ trip: Trip | null; error?: string }> {
  const vid = vehicleUuid.trim();
  const tripNum = tripNumber.trim();
  if (!vid || !tripNum || tripNum === '—') return { trip: null };

  let { data: rows, error } = await supabase
    .from('trips')
    .select(tripDetailSelect())
    .eq('vehicle_id', vid)
    .eq('trip_number', tripNum)
    .order('scheduled_date', { ascending: false })
    .limit(1);

  if (error && tripsLogisticsNotesColumnAvailable && isMissingLogisticsNotesColumnError(error)) {
    tripsLogisticsNotesColumnAvailable = false;
    console.warn(
      '[logistics] trips.logistics_notes missing — run database/trips_logistics_notes.sql. Retrying trip fetch without it.',
    );
    const retry = await supabase
      .from('trips')
      .select(tripDetailSelect())
      .eq('vehicle_id', vid)
      .eq('trip_number', tripNum)
      .order('scheduled_date', { ascending: false })
      .limit(1);
    rows = retry.data;
    error = retry.error;
  }

  if (error) return { trip: null, error: error.message };
  const row = rows?.[0] as unknown as Record<string, unknown> | undefined;
  if (!row) return { trip: null };

  return { trip: await tripRowRecordToTrip(row) };
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar dates (YYYY-MM-DD) a trip occupies — from departure through eta, inclusive. */
export function tripOccupiedDateKeys(trip: Trip): string[] {
  const start = fmtDate(trip.scheduledDate);
  if (!start) return [];
  const end = fmtDate(trip.eta) || start;
  const endKey = end >= start ? end : start;
  const keys: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${endKey}T12:00:00`);
  while (cur <= last) {
    keys.push(localDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function tripBlocksVehicleCalendar(t: Trip, excludeTripId?: string): boolean {
  if (t.id === excludeTripId) return false;
  return (
    ACTIVE_TRIP_STATUSES.includes(t.status as (typeof ACTIVE_TRIP_STATUSES)[number]) ||
    isActiveTripStatus(t.status)
  );
}

export function tripsConflictingVehicleAndDate(
  trips: Trip[],
  vehicleUuid: string,
  dateYmd: string,
  excludeTripId?: string,
): Trip[] {
  if (!vehicleUuid || !dateYmd) return [];
  return trips.filter(
    (t) =>
      t.vehicleId === vehicleUuid &&
      tripBlocksVehicleCalendar(t, excludeTripId) &&
      tripOccupiedDateKeys(t).includes(dateYmd),
  );
}

/** True when any selected day overlaps an active trip on the same vehicle. */
export function tripsConflictingVehicleOnDates(
  trips: Trip[],
  vehicleUuid: string,
  dateYmds: string[],
  excludeTripId?: string,
): Trip[] {
  if (!vehicleUuid || !dateYmds.length) return [];
  const want = new Set(dateYmds.map((d) => fmtDate(d)).filter(Boolean));
  if (!want.size) return [];
  const seen = new Set<string>();
  const conflicts: Trip[] = [];
  for (const t of trips) {
    if (t.vehicleId !== vehicleUuid || !tripBlocksVehicleCalendar(t, excludeTripId)) continue;
    for (const k of tripOccupiedDateKeys(t)) {
      if (want.has(k) && !seen.has(t.id)) {
        seen.add(t.id);
        conflicts.push(t);
      }
    }
  }
  return conflicts;
}

export function tripsConflictingDriverAndDate(
  trips: Trip[],
  driverUuid: string | null | undefined,
  dateYmd: string,
  excludeTripId?: string,
): Trip[] {
  if (!driverUuid || !dateYmd) return [];
  return trips.filter(
    (t) =>
      t.id !== excludeTripId &&
      t.driverId === driverUuid &&
      t.scheduledDate === dateYmd &&
      ACTIVE_TRIP_STATUSES.includes(t.status as (typeof ACTIVE_TRIP_STATUSES)[number]) ||
      isActiveTripStatus(t.status),
  );
}

export async function fetchDriversForBranch(branchName: string): Promise<{ drivers: DriverOption[]; error?: string }> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { drivers: [], error: 'Branch not found' };
  const { data, error } = await supabase
    .from('employees')
    .select('id, employee_name, status')
    .eq('branch_id', bid)
    .eq('role', 'Truck Driver')
    .order('employee_name');
  if (error) return { drivers: [], error: error.message };
  return {
    drivers: (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: (r.employee_name as string) ?? '—',
      status: (r.status as string) ?? 'active',
    })),
  };
}

export async function createTripFromPlanning(params: {
  branchName: string;
  vehicleUuid: string;
  orderUuids: string[];
  /** One or more calendar days the truck is out (earliest = departure). */
  scheduledDates: string[];
  totalWeightKg: number;
  totalVolumeCbm: number;
  driverUuid?: string | null;
  driverName?: string | null;
}): Promise<{ ok: boolean; error?: string; tripId?: string; tripNumber?: string }> {
  const bid = await resolveBranchIdByName(params.branchName.trim());
  if (!bid) return { ok: false, error: 'Branch not found' };
  if (!params.vehicleUuid) return { ok: false, error: 'Select a truck' };
  if (!params.orderUuids.length) return { ok: false, error: 'Select at least one order' };
  const sortedDates = [...new Set(params.scheduledDates.map((x) => fmtDate(x)).filter(Boolean))].sort();
  if (!sortedDates.length || sortedDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
    return { ok: false, error: 'Invalid date' };
  }
  const d = sortedDates[0];
  const endD = sortedDates[sortedDates.length - 1];

  for (const day of sortedDates) {
    const { data: maintRow } = await supabase
      .from('maintenance_records')
      .select('id, status')
      .eq('vehicle_id', params.vehicleUuid)
      .eq('scheduled_date', day)
      .limit(5);
    const blocked = (maintRow ?? []).some((r: { status?: string | null }) => {
      const st = String(r.status ?? '').trim().toLowerCase();
      return st !== 'completed';
    });
    if (blocked) {
      return { ok: false, error: `This truck has maintenance scheduled on ${day}.` };
    }
  }

  const { data: veh, error: vErr } = await supabase
    .from('vehicles')
    .select('vehicle_name, max_weight_kg, max_volume_cbm')
    .eq('id', params.vehicleUuid)
    .maybeSingle();
  if (vErr || !veh) return { ok: false, error: vErr?.message ?? 'Truck not found' };

  const maxW = num(veh.max_weight_kg, 5000);
  const maxV = num(veh.max_volume_cbm, 25);
  const wPct = maxW > 0 ? (params.totalWeightKg / maxW) * 100 : 0;
  const vPct = maxV > 0 ? (params.totalVolumeCbm / maxV) * 100 : 0;
  const capacityPct = Math.min(100, Math.round(Math.max(wPct, vPct)));

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const tripNumber = `TRIP-${d.replace(/-/g, '')}-${suffix}`;

  const { data: inserted, error: insErr } = await supabase
    .from('trips')
    .insert({
      trip_number: tripNumber,
      vehicle_id: params.vehicleUuid,
      vehicle_name: (veh.vehicle_name as string) ?? null,
      driver_id: params.driverUuid ?? null,
      driver_name: params.driverName ?? null,
      status: toDbTripStatus('Scheduled'),
      scheduled_date: d,
      eta: sortedDates.length > 1 ? `${endD}T23:59:59.999Z` : null,
      order_ids: params.orderUuids,
      destinations: [],
      weight_used_kg: params.totalWeightKg,
      volume_used_cbm: params.totalVolumeCbm,
      capacity_used_percent: capacityPct,
      max_weight_kg: maxW,
      max_volume_cbm: maxV,
      branch_id: bid,
    })
    .select('id')
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  const tripId = inserted?.id as string;

  const scheduledAt = new Date().toISOString();
  const { error: ordErr } = await supabase
    .from('orders')
    .update({
      status: 'Scheduled',
      scheduled_departure_date: d,
      updated_at: scheduledAt,
    })
    .in('id', params.orderUuids);

  if (ordErr) {
    await supabase.from('trips').delete().eq('id', tripId);
    return { ok: false, error: ordErr.message };
  }

  return { ok: true, tripId, tripNumber };
}

/** Schedule inter-island container shipment — same trip model as trucks, no driver or route planning. */
export async function createContainerShipmentFromPlanning(params: {
  branchName: string;
  containerUuid: string;
  orderUuids: string[];
  /** One or more calendar days the container is out (earliest = departure). */
  scheduledDates: string[];
  totalWeightKg: number;
  totalVolumeCbm: number;
  /** e.g. "Manila Port → Cebu" — stored on `trips.destinations`. */
  routeLabel: string;
}): Promise<{ ok: boolean; error?: string; tripId?: string; tripNumber?: string }> {
  const bid = await resolveBranchIdByName(params.branchName.trim());
  if (!bid) return { ok: false, error: 'Branch not found' };
  if (!params.containerUuid) return { ok: false, error: 'Select a shipping container' };
  if (!params.orderUuids.length) return { ok: false, error: 'Select at least one order' };
  const sortedDates = [...new Set(params.scheduledDates.map((x) => fmtDate(x)).filter(Boolean))].sort();
  if (!sortedDates.length || sortedDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
    return { ok: false, error: 'Invalid date' };
  }
  const d = sortedDates[0];
  const endD = sortedDates[sortedDates.length - 1];

  const { data: veh, error: vErr } = await supabase
    .from('vehicles')
    .select('vehicle_name, max_weight_kg, max_volume_cbm, type')
    .eq('id', params.containerUuid)
    .maybeSingle();
  if (vErr || !veh) return { ok: false, error: vErr?.message ?? 'Container not found' };
  if ((veh.type as string) !== 'Shipping Container') {
    return { ok: false, error: 'Selected asset is not a shipping container.' };
  }

  const maxW = num(veh.max_weight_kg, 5000);
  const maxV = num(veh.max_volume_cbm, 25);
  const wPct = maxW > 0 ? (params.totalWeightKg / maxW) * 100 : 0;
  const vPct = maxV > 0 ? (params.totalVolumeCbm / maxV) * 100 : 0;
  const capacityPct = Math.min(100, Math.round(Math.max(wPct, vPct)));

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const tripNumber = `SHIP-${d.replace(/-/g, '')}-${suffix}`;
  const destinations = params.routeLabel.trim() ? [params.routeLabel.trim()] : ['Inter-island'];

  const { data: inserted, error: insErr } = await supabase
    .from('trips')
    .insert({
      trip_number: tripNumber,
      vehicle_id: params.containerUuid,
      vehicle_name: (veh.vehicle_name as string) ?? null,
      driver_id: null,
      driver_name: null,
      status: toDbTripStatus('Scheduled'),
      scheduled_date: d,
      eta: sortedDates.length > 1 ? `${endD}T23:59:59.999Z` : null,
      order_ids: params.orderUuids,
      destinations,
      weight_used_kg: params.totalWeightKg,
      volume_used_cbm: params.totalVolumeCbm,
      capacity_used_percent: capacityPct,
      max_weight_kg: maxW,
      max_volume_cbm: maxV,
      branch_id: bid,
    })
    .select('id')
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  const tripId = inserted?.id as string;

  const scheduledAt = new Date().toISOString();
  const { error: ordErr } = await supabase
    .from('orders')
    .update({
      status: 'Scheduled',
      scheduled_departure_date: d,
      updated_at: scheduledAt,
    })
    .in('id', params.orderUuids);

  if (ordErr) {
    await supabase.from('trips').delete().eq('id', tripId);
    return { ok: false, error: ordErr.message };
  }

  return { ok: true, tripId, tripNumber };
}

/**
 * Update an existing trip: change status, vehicle, driver, orders, delay text, and logistics notes.
 * Automatically resets removed orders to 'Approved' and marks added orders as 'Scheduled'.
 */
export async function updateTrip(params: {
  tripId: string;
  status: Trip['status'];
  vehicleUuid: string;
  vehicleName: string;
  driverUuid: string | null;
  driverName: string;
  orderUuids: string[];
  previousOrderUuids: string[];
  totalWeightKg: number;
  totalVolumeCbm: number;
  /** `trips.delay_reason` — delay explanation only. */
  delayReason: string;
  /** `trips.logistics_notes` — route / driver / dispatch notes (never delay text). */
  logisticsNotes: string;
  orderStatuses?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: veh, error: vErr } = await supabase
    .from('vehicles')
    .select('vehicle_name, max_weight_kg, max_volume_cbm')
    .eq('id', params.vehicleUuid)
    .maybeSingle();
  if (vErr || !veh) return { ok: false, error: vErr?.message ?? 'Truck not found' };

  const maxW = num(veh.max_weight_kg, 5000);
  const maxV = num(veh.max_volume_cbm, 25);
  const wPct = maxW > 0 ? (params.totalWeightKg / maxW) * 100 : 0;
  const vPct = maxV > 0 ? (params.totalVolumeCbm / maxV) * 100 : 0;
  const capacityPct = Math.min(100, Math.round(Math.max(wPct, vPct)));
  const now = new Date().toISOString();

  const payloadCommon: Record<string, unknown> = {
    status: toDbTripStatus(params.status),
    vehicle_id: params.vehicleUuid,
    vehicle_name: params.vehicleName,
    driver_id: params.driverUuid,
    driver_name: params.driverName,
    order_ids: params.orderUuids,
    weight_used_kg: params.totalWeightKg,
    volume_used_cbm: params.totalVolumeCbm,
    capacity_used_percent: capacityPct,
    max_weight_kg: maxW,
    max_volume_cbm: maxV,
    delay_reason: params.delayReason.trim() ? params.delayReason.trim() : null,
    updated_at: now,
  };

  let updErr;
  if (tripsLogisticsNotesColumnAvailable) {
    const r = await supabase
      .from('trips')
      .update({
        ...payloadCommon,
        logistics_notes: params.logisticsNotes.trim() ? params.logisticsNotes.trim() : null,
      })
      .eq('id', params.tripId);
    updErr = r.error;
    if (updErr && isMissingLogisticsNotesColumnError(updErr)) {
      tripsLogisticsNotesColumnAvailable = false;
      console.warn(
        '[logistics] trips.logistics_notes missing — run database/trips_logistics_notes.sql. Saved trip without logistics_notes.',
      );
      const r2 = await supabase.from('trips').update(payloadCommon).eq('id', params.tripId);
      updErr = r2.error;
    }
  } else {
    const r = await supabase.from('trips').update(payloadCommon).eq('id', params.tripId);
    updErr = r.error;
  }

  if (updErr) return { ok: false, error: updErr.message };

  if (params.orderUuids.length === 0) {
    const removed = params.previousOrderUuids;
    if (removed.length > 0) {
      await supabase
        .from('orders')
        .update({ status: 'Approved', scheduled_departure_date: null, updated_at: new Date().toISOString() })
        .in('id', removed);
    }
    const { error: delErr } = await supabase.from('trips').delete().eq('id', params.tripId);
    if (delErr) return { ok: false, error: delErr.message };
    return { ok: true };
  }

  // Orders removed from this trip → revert to Approved
  const removed = params.previousOrderUuids.filter((id) => !params.orderUuids.includes(id));
  if (removed.length > 0) {
    await supabase
      .from('orders')
      .update({ status: 'Approved', scheduled_departure_date: null, updated_at: new Date().toISOString() })
      .in('id', removed);
  }

  // Apply per-order status from the editor; fall back to 'Scheduled' for any without explicit status
  const orderNow = new Date().toISOString();
  for (const id of params.orderUuids) {
    const orderSt = params.orderStatuses?.[id] ?? 'Scheduled';
    await supabase
      .from('orders')
      .update({ status: orderSt, updated_at: orderNow })
      .eq('id', id);
  }

  return { ok: true };
}

/** Order statuses that imply the order is assigned on an active trip row. */
export const ORDER_TRIP_LINKED_STATUSES = [
  'Scheduled',
  'Loading',
  'Packed',
  'Ready',
  'In Transit',
] as const;

/** Statuses that should no longer occupy a trip — order returns to dispatch queue or exits logistics. */
export const ORDER_RELEASE_TRIP_TO_STATUSES = [
  'Approved',
  'Partially Fulfilled',
  'Cancelled',
  'Rejected',
  'Draft',
  'Pending',
] as const;

/** True when reverting or unscheduling should detach the order from `trips.order_ids`. */
export function shouldReleaseOrderFromTrips(prevStatus: string, nextStatus: string): boolean {
  const prev = String(prevStatus ?? '').trim();
  const next = String(nextStatus ?? '').trim();
  if (!(ORDER_TRIP_LINKED_STATUSES as readonly string[]).includes(prev)) return false;
  return (ORDER_RELEASE_TRIP_TO_STATUSES as readonly string[]).includes(next);
}

export type ReleaseOrderFromTripsResult = {
  ok: boolean;
  error?: string;
  tripsUpdated: number;
  tripsDeleted: number;
  tripIds: string[];
};

async function recalcTripLoadFromOrders(
  orderIds: string[],
  maxWeightKg: number,
  maxVolumeCbm: number,
): Promise<{ weightKg: number; volumeCbm: number; capacityPct: number }> {
  if (!orderIds.length) return { weightKg: 0, volumeCbm: 0, capacityPct: 0 };

  const { data: orders, error } = await supabase
    .from('orders')
    .select('weight_kg, volume_cbm')
    .in('id', orderIds);
  if (error) throw new Error(error.message);

  let weightKg = 0;
  let volumeCbm = 0;
  for (const o of orders ?? []) {
    weightKg += num((o as { weight_kg?: unknown }).weight_kg, 0);
    volumeCbm += num((o as { volume_cbm?: unknown }).volume_cbm, 0);
  }
  const wPct = maxWeightKg > 0 ? (weightKg / maxWeightKg) * 100 : 0;
  const vPct = maxVolumeCbm > 0 ? (volumeCbm / maxVolumeCbm) * 100 : 0;
  const capacityPct = Math.min(100, Math.round(Math.max(wPct, vPct)));
  return { weightKg, volumeCbm, capacityPct };
}

/**
 * Remove an order from active trips when it is unscheduled or leaves the logistics flow.
 * Deletes the trip when it was the only order; otherwise updates load totals on the trip.
 */
export async function releaseOrderFromActiveTrips(orderId: string): Promise<ReleaseOrderFromTripsResult> {
  const oid = orderId.trim();
  if (!oid) {
    return { ok: false, error: 'Order id required', tripsUpdated: 0, tripsDeleted: 0, tripIds: [] };
  }

  const { data: tripRows, error: fetchErr } = await supabase
    .from('trips')
    .select('id, order_ids, status, max_weight_kg, max_volume_cbm')
    .contains('order_ids', [oid]);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, tripsUpdated: 0, tripsDeleted: 0, tripIds: [] };
  }

  let tripsUpdated = 0;
  let tripsDeleted = 0;
  const tripIds: string[] = [];
  const now = new Date().toISOString();

  for (const raw of tripRows ?? []) {
    const row = raw as Record<string, unknown>;
    if (!isActiveTripStatus(String(row.status ?? ''))) continue;

    const orderIds = ((row.order_ids ?? []) as string[]).filter(Boolean);
    if (!orderIds.includes(oid)) continue;

    const tripId = String(row.id ?? '');
    if (!tripId) continue;
    tripIds.push(tripId);

    const remaining = orderIds.filter((id) => id !== oid);

    if (remaining.length === 0) {
      const { error: delErr } = await supabase.from('trips').delete().eq('id', tripId);
      if (delErr) {
        return { ok: false, error: delErr.message, tripsUpdated, tripsDeleted, tripIds };
      }
      tripsDeleted += 1;
      continue;
    }

    const maxW = num(row.max_weight_kg, 5000);
    const maxV = num(row.max_volume_cbm, 25);
    let load: { weightKg: number; volumeCbm: number; capacityPct: number };
    try {
      load = await recalcTripLoadFromOrders(remaining, maxW, maxV);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not recalculate trip load';
      return { ok: false, error: msg, tripsUpdated, tripsDeleted, tripIds };
    }

    const { error: updErr } = await supabase
      .from('trips')
      .update({
        order_ids: remaining,
        weight_used_kg: load.weightKg,
        volume_used_cbm: load.volumeCbm,
        capacity_used_percent: load.capacityPct,
        updated_at: now,
      })
      .eq('id', tripId);

    if (updErr) {
      return { ok: false, error: updErr.message, tripsUpdated, tripsDeleted, tripIds };
    }
    tripsUpdated += 1;
  }

  return { ok: true, tripsUpdated, tripsDeleted, tripIds };
}
