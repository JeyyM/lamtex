/**
 * Logistics scheduling: orders ready for route planning, branch trips, trip creation.
 * **Approved** and **Partially Fulfilled** orders (not on an active trip) appear for scheduling.
 */
import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import type { OrderReadyForDispatch, Trip, DriverOption } from '@/src/types/logistics';

const QUEUE_STATUSES = ['Approved', 'Partially Fulfilled'] as const;

/** Trips that still "hold" assigned orders on the truck/driver calendar. */
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

/** Branch depot / HQ pin from company_settings (for route map origin). */
export async function fetchBranchHqCoords(branchName: string): Promise<{ lat: number; lng: number } | null> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return null;
  const { data, error } = await supabase
    .from('company_settings')
    .select('hq_latitude, hq_longitude')
    .eq('branch_id', bid)
    .maybeSingle();
  if (error || !data) return null;
  const la = data.hq_latitude != null ? Number(data.hq_latitude) : NaN;
  const ln = data.hq_longitude != null ? Number(data.hq_longitude) : NaN;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

/** Orders eligible for new trip assignment: Approved or Partially Fulfilled, not already on an active trip. */
export async function fetchLogisticsOrderQueue(branchName: string): Promise<{
  orders: OrderReadyForDispatch[];
  error?: string;
}> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { orders: [], error: 'Branch not found' };

  const { data: tripRows, error: tripErr } = await supabase
    .from('trips')
    .select('order_ids, status')
    .eq('branch_id', bid);

  if (tripErr) return { orders: [], error: tripErr.message };

  const assigned = new Set<string>();
  for (const t of tripRows ?? []) {
    if (!ACTIVE_TRIP_STATUSES.includes(t.status as (typeof ACTIVE_TRIP_STATUSES)[number])) continue;
    const ids = (t.order_ids ?? []) as string[];
    ids.forEach((id) => id && assigned.add(id));
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_id, customer_name, required_date, delivery_address, urgency, volume_cbm, weight_kg, status, branches(name), customers(map_lat, map_lng)',
    )
    .eq('branch_id', bid)
    .in('status', [...QUEUE_STATUSES]);

  if (error) return { orders: [], error: error.message };

  const partialIds = (orders ?? [])
    .filter((o) => String((o as { status?: string }).status ?? '').trim() === 'Partially Fulfilled')
    .map((o) => o.id as string);

  /** Per order: total ordered units vs still to deliver (for load scaling). */
  const remainderByOrder = new Map<string, { ordered: number; remaining: number }>();

  if (partialIds.length) {
    const { data: lineRows, error: lineErr } = await supabase
      .from('order_line_items')
      .select('order_id, quantity, quantity_delivered')
      .in('order_id', partialIds);
    if (lineErr) return { orders: [], error: lineErr.message };
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

  const out: OrderReadyForDispatch[] = [];
  for (const o of orders ?? []) {
    if (assigned.has(o.id as string)) continue;
    const dest =
      (o.delivery_address && String(o.delivery_address).split(/[\n,]/)[0]?.trim()?.slice(0, 120)) ||
      (o.customer_name as string) ||
      '—';
    const urgRaw = (o.urgency as string) || 'Medium';
    const urg: 'High' | 'Medium' | 'Low' =
      urgRaw === 'High' || urgRaw === 'Critical' ? 'High' : urgRaw === 'Low' ? 'Low' : 'Medium';
    const branchLabel =
      (o.branches as { name?: string } | null)?.name ?? branchName;
    const custRow = o.customers as { map_lat?: unknown; map_lng?: unknown } | null;
    const mLa = custRow?.map_lat != null ? Number(custRow.map_lat) : NaN;
    const mLn = custRow?.map_lng != null ? Number(custRow.map_lng) : NaN;

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
      customerId: (o.customer_id as string) ?? null,
      mapLat: Number.isFinite(mLa) ? mLa : null,
      mapLng: Number.isFinite(mLn) ? mLn : null,
      branch: branchLabel,
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

/** Trips for dispatch calendar and conflict checks. */
export async function fetchTripsForBranch(branchName: string): Promise<{ trips: Trip[]; error?: string }> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { trips: [], error: 'Branch not found' };

  let sel = tripBranchListSelect();
  let { data, error } = await supabase
    .from('trips')
    .select(sel)
    .eq('branch_id', bid)
    .order('scheduled_date', { ascending: true });

  if (error && tripsLogisticsNotesColumnAvailable && isMissingLogisticsNotesColumnError(error)) {
    tripsLogisticsNotesColumnAvailable = false;
    console.warn(
      '[logistics] trips.logistics_notes missing — run database/trips_logistics_notes.sql. Retrying trip fetch without it.',
    );
    const retry = await supabase
      .from('trips')
      .select(tripBranchListSelect())
      .eq('branch_id', bid)
      .order('scheduled_date', { ascending: true });
    data = retry.data;
    error = retry.error;
  }

  if (error) return { trips: [], error: error.message };

  const vehicleIds = [
    ...new Set(
      (data ?? [])
        .map((r) => r.vehicle_id as string | null | undefined)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const plateByVehicleId = new Map<string, string>();
  if (vehicleIds.length) {
    const { data: vrows } = await supabase.from('vehicles').select('id, plate_number').in('id', vehicleIds);
    for (const v of vrows ?? []) {
      const id = v.id as string;
      const plate = (v.plate_number as string | null | undefined)?.trim();
      if (plate) plateByVehicleId.set(id, plate);
    }
  }

  const trips: Trip[] = (data ?? []).map((row: Record<string, unknown>) => {
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
      departureTime: dep ? new Date(dep).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : undefined,
      destinations: dest.length ? dest : ['—'],
      orders: orderIds,
      capacityUsed: num(row.capacity_used_percent, 0),
      weightUsed: num(row.weight_used_kg, 0),
      volumeUsed: num(row.volume_used_cbm, 0),
      maxWeight: num(row.max_weight_kg, 5000),
      maxVolume: num(row.max_volume_cbm, 25),
      plateNumber: vehicleUuid ? plateByVehicleId.get(vehicleUuid) ?? null : null,
      eta: eta ? fmtDate(eta) : undefined,
      actualArrival: arr ? new Date(arr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : undefined,
      delayReason: (row.delay_reason as string) ?? undefined,
      logisticsNotes: (row.logistics_notes as string) ?? undefined,
      branch: branchName,
    };
  });

  return { trips };
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

  return { trip: await tripRowRecordToTrip(row as Record<string, unknown>) };
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
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return { trip: null };

  return { trip: await tripRowRecordToTrip(row) };
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
      t.id !== excludeTripId &&
      t.vehicleId === vehicleUuid &&
      t.scheduledDate === dateYmd &&
      ACTIVE_TRIP_STATUSES.includes(t.status as (typeof ACTIVE_TRIP_STATUSES)[number]),
  );
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
      ACTIVE_TRIP_STATUSES.includes(t.status as (typeof ACTIVE_TRIP_STATUSES)[number]),
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
  scheduledDate: string;
  totalWeightKg: number;
  totalVolumeCbm: number;
  driverUuid?: string | null;
  driverName?: string | null;
}): Promise<{ ok: boolean; error?: string; tripId?: string; tripNumber?: string }> {
  const bid = await resolveBranchIdByName(params.branchName.trim());
  if (!bid) return { ok: false, error: 'Branch not found' };
  if (!params.vehicleUuid) return { ok: false, error: 'Select a truck' };
  if (!params.orderUuids.length) return { ok: false, error: 'Select at least one order' };
  const d = params.scheduledDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: 'Invalid date' };

  const { data: maintRow } = await supabase
    .from('maintenance_records')
    .select('id, status')
    .eq('vehicle_id', params.vehicleUuid)
    .eq('scheduled_date', d)
    .limit(5);
  const blocked = (maintRow ?? []).some((r: { status?: string | null }) => {
    const st = String(r.status ?? '').trim().toLowerCase();
    return st !== 'completed';
  });
  if (blocked) return { ok: false, error: 'This truck has maintenance scheduled on that date.' };

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
