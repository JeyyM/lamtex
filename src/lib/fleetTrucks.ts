import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import type { Vehicle } from '@/src/types/logistics';
import type {
  TruckDetails,
  MaintenanceRecord,
  TripHistoryRecord,
  CalendarBooking,
  TruckAlert,
} from '@/src/mock/truckDetails';

// ─── Vehicle ↔ Trip sync ──────────────────────────────────────────────────────

export type TripSyncPayload = {
  tripId: string;
  tripNumber: string;
  vehicleId: string;         // vehicles.id UUID
  driverName: string;
  scheduledDate: string;     // YYYY-MM-DD
  destinations: string[];
  ordersCount: number;
  capacityUsedPercent: number;
  branchId?: string | null;
};

/**
 * Called when a trip becomes active (Loading / In Transit).
 * Sets vehicles.status = 'On Trip' and vehicles.current_trip_id.
 */
export async function syncVehicleOnTripStart(p: Pick<TripSyncPayload, 'vehicleId' | 'tripId'>): Promise<void> {
  if (!p.vehicleId) return;
  await supabase
    .from('vehicles')
    .update({ status: 'On Trip', current_trip_id: p.tripId, updated_at: new Date().toISOString() })
    .eq('id', p.vehicleId);
}

/**
 * Called when a trip reaches a terminal status (Complete / Delivered / Cancelled).
 * - Sets vehicles.status = 'Available', clears current_trip_id
 * - Increments vehicles.trips_today
 * - Recalculates vehicles.utilization_percent (rolling avg of last 10 trips for this vehicle)
 * - Inserts a record into trip_history
 */
export async function syncVehicleOnTripComplete(
  p: TripSyncPayload,
  finalStatus: 'Completed' | 'Failed' | 'Complete' | 'Delivered' | 'Cancelled',
): Promise<void> {
  if (!p.vehicleId) return;
  // Map app-level statuses to DB enum values for trip_history
  const dbStatus: 'Completed' | 'Failed' =
    finalStatus === 'Cancelled' || finalStatus === 'Failed' ? 'Failed' : 'Completed';
  const now = new Date().toISOString();

  // 1. Fetch current trips_today so we can increment it
  const { data: vrow } = await supabase
    .from('vehicles')
    .select('trips_today, utilization_percent')
    .eq('id', p.vehicleId)
    .maybeSingle();

  const tripsToday = (Number((vrow as { trips_today?: number } | null)?.trips_today) || 0) + 1;

  // 2. Rolling utilization: average capacity of last 10 trips for this vehicle in trip_history
  const { data: recent } = await supabase
    .from('trip_history')
    .select('delivery_success_rate')
    .eq('vehicle_id', p.vehicleId)
    .order('created_at', { ascending: false })
    .limit(9);

  const pastRates = ((recent ?? []) as { delivery_success_rate?: number | null }[])
    .map((r) => Number(r.delivery_success_rate ?? 0))
    .filter((n) => Number.isFinite(n));
  const allRates = [...pastRates, p.capacityUsedPercent];
  const avgUtil = Math.round(allRates.reduce((s, v) => s + v, 0) / allRates.length);

  // 3. Update vehicle
  await supabase
    .from('vehicles')
    .update({
      status: 'Available',
      current_trip_id: null,
      trips_today: tripsToday,
      utilization_percent: avgUtil,
      updated_at: now,
    })
    .eq('id', p.vehicleId);

  // 4. Insert trip_history row (upsert on trip_id to avoid duplicates)
  await supabase.from('trip_history').upsert(
    {
      trip_id: p.tripId,
      trip_number: p.tripNumber,
      vehicle_id: p.vehicleId,
      driver_name: p.driverName,
      scheduled_date: p.scheduledDate,
      destinations: p.destinations,
      orders_count: p.ordersCount,
      delivery_success_rate: p.capacityUsedPercent,
      status: dbStatus,
      branch_id: p.branchId ?? null,
      created_at: now,
    },
    { onConflict: 'trip_id', ignoreDuplicates: false },
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFleetVehicleUuid(id: string | undefined): boolean {
  return !!id && UUID_RE.test(id.trim());
}

function num(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : fallback;
}

function int(n: unknown, fallback = 0): number {
  return Math.round(num(n, fallback));
}

function fmtDate(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.slice(0, 10);
}

function fmtDateTime(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

type VehicleRow = {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  plate_number: string | null;
  type: string;
  status: Vehicle['status'];
  financing_status?: string | null;
  current_trip_id: string | null;
  trips_today: number | null;
  next_available_time: string | null;
  utilization_percent: number | string | null;
  max_weight_kg: number | string | null;
  max_volume_cbm: number | string | null;
  maintenance_due: string | null;
  alerts: string[] | null;
  make: string | null;
  model: string | null;
  year_model: number | null;
  color: string | null;
  orcr_number: string | null;
  registration_expiry: string | null;
  current_odometer_km: number | string | null;
  engine_type?: string | null;
  vehicle_length_m?: number | string | null;
  vehicle_width_m?: number | string | null;
  vehicle_height_m?: number | string | null;
  date_first_registered?: string | null;
  date_acquired?: string | null;
  created_at: string;
  branches?: { name: string } | null;
};

function mapRowToVehicle(row: VehicleRow, tripNumberById: Map<string, string>): Vehicle {
  const tripNo = row.current_trip_id ? tripNumberById.get(row.current_trip_id) : undefined;
  const mw = num(row.max_weight_kg);
  const mv = num(row.max_volume_cbm);
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    plateNumber: row.plate_number ?? undefined,
    type: 'Truck',
    status: row.status,
    currentTrip: tripNo,
    tripsToday: int(row.trips_today),
    nextAvailableTime: fmtDateTime(row.next_available_time),
    utilizationPercent: Math.round(num(row.utilization_percent)),
    maxWeight: mw,
    maxVolume: mv,
    maxCapacityKg: mw,
    maxCapacityCbm: mv,
    maintenanceDue: fmtDate(row.maintenance_due),
    alerts: row.alerts ?? undefined,
    branch: row.branches?.name,
  };
}

async function loadTripNumbersForVehicles(rows: VehicleRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.current_trip_id).filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('trips').select('id, trip_number').in('id', ids);
  if (error || !data) return new Map();
  return new Map(data.map((t) => [t.id as string, t.trip_number as string]));
}

/**
 * Vehicles that have **non-completed** maintenance with `scheduled_date` on `dateYmd`.
 * Used to block route assignment on that calendar day.
 */
export async function fetchVehicleIdsWithMaintenanceOnDate(
  vehicleUuids: string[],
  dateYmd: string,
): Promise<{ blockedIds: Set<string>; error?: string }> {
  const ids = [...new Set(vehicleUuids.map((s) => s.trim()).filter(Boolean))];
  if (!ids.length || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    return { blockedIds: new Set() };
  }
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('vehicle_id, status')
    .in('vehicle_id', ids)
    .eq('scheduled_date', dateYmd);
  if (error) return { blockedIds: new Set(), error: error.message };
  const blocked = new Set<string>();
  for (const r of data ?? []) {
    const row = r as { vehicle_id: string; status?: string | null };
    const st = String(row.status ?? '').trim().toLowerCase();
    if (st === 'completed') continue;
    blocked.add(row.vehicle_id);
  }
  return { blockedIds: blocked };
}

/** All scheduled (non-completed) maintenance dates for one vehicle — for trip calendar + confirm guard. */
export async function fetchMaintenanceScheduledDatesForVehicle(
  vehicleUuid: string,
): Promise<{ dates: string[]; error?: string }> {
  const id = vehicleUuid.trim();
  if (!id) return { dates: [] };
  const { data, error } = await supabase
    .from('maintenance_records')
    .select('scheduled_date, status')
    .eq('vehicle_id', id)
    .not('scheduled_date', 'is', null);
  if (error) return { dates: [], error: error.message };
  const dates: string[] = [];
  for (const r of data ?? []) {
    const row = r as { scheduled_date: string; status?: string | null };
    const st = String(row.status ?? '').trim().toLowerCase();
    if (st === 'completed') continue;
    const d = String(row.scheduled_date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(d);
  }
  return { dates: [...new Set(dates)] };
}

/** Trucks for the branch selected in the header (`branches.name` must match). */
export async function fetchFleetTrucksForBranch(branchName: string): Promise<{
  vehicles: Vehicle[];
  error?: string;
}> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) {
    return { vehicles: [], error: 'Could not resolve branch for fleet list.' };
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('branch_id', bid)
    .eq('type', 'Truck')
    .order('vehicle_id', { ascending: true });

  if (error) {
    return { vehicles: [], error: error.message };
  }

  const rows = (data ?? []) as VehicleRow[];
  const tripMap = await loadTripNumbersForVehicles(rows);
  return { vehicles: rows.map((r) => mapRowToVehicle(r, tripMap)) };
}


/** Trip statuses that count as finished legs for totals and utilization averages. */
const TRIP_DB_TERMINAL = new Set(['Completed', 'Failed', 'Delayed']);

function dbStatusToHistoryLabel(st: string): string {
  if (st === 'Failed') return 'Failed';
  if (st === 'Delayed') return 'Delayed';
  if (st === 'Completed') return 'Completed';
  if (st === 'In Transit') return 'In Transit';
  if (st === 'Loading') return 'Loading';
  if (st === 'Planned' || st === 'Pending') return 'Scheduled';
  return st.trim() || 'Scheduled';
}

function liveTripRowToHistoryRecord(row: {
  id: string;
  trip_number: string | null;
  scheduled_date: string | null;
  driver_id?: string | null;
  driver_name: string | null;
  destinations: string[] | null;
  order_ids: string[] | null;
  status: string | null;
  capacity_used_percent: number | string | null;
}): TripHistoryRecord {
  const st = String(row.status ?? '');
  const orderIds = ((row.order_ids ?? []) as string[]).filter(Boolean);
  const dsr = row.capacity_used_percent;
  return {
    id: row.id,
    tripId: row.id,
    tripNumber: row.trip_number ?? '—',
    date: (row.scheduled_date ?? '').slice(0, 10),
    driverName: row.driver_name ?? '',
    driverId: (row.driver_id as string | null) ?? '',
    route: row.destinations ?? [],
    ordersCount: orderIds.length,
    distance: 0,
    duration: '—',
    status: dbStatusToHistoryLabel(st),
    fuelUsed: 0,
    fuelCost: 0,
    revenue: 0,
    deliverySuccessRate: dsr != null && dsr !== '' ? num(dsr) : undefined,
  };
}

function computeTruckUtilizationDisplay(params: {
  liveTrips: { scheduled_date: string | null; status: string | null; capacity_used_percent: unknown }[];
  histOnly: { scheduled_date: string | null; status: string | null; delivery_success_rate: unknown }[];
  vehicleColumn: number;
}): number {
  type Point = { date: string; rate: number };
  const points: Point[] = [];
  for (const t of params.liveTrips) {
    if (!TRIP_DB_TERMINAL.has(String(t.status ?? ''))) continue;
    points.push({
      date: (t.scheduled_date ?? '').slice(0, 10),
      rate: num(t.capacity_used_percent),
    });
  }
  for (const h of params.histOnly) {
    if (!TRIP_DB_TERMINAL.has(String(h.status ?? ''))) continue;
    points.push({
      date: (h.scheduled_date ?? '').slice(0, 10),
      rate: num(h.delivery_success_rate),
    });
  }
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekYmd = weekAgo.toISOString().slice(0, 10);
  const inWeek = points.filter((p) => p.date >= weekYmd && Number.isFinite(p.rate) && p.rate >= 0);
  if (inWeek.length) {
    return Math.round(inWeek.reduce((s, p) => s + p.rate, 0) / inWeek.length);
  }
  const sorted = [...points]
    .filter((p) => Number.isFinite(p.rate) && p.rate >= 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 10);
  if (recent.length) {
    return Math.round(recent.reduce((s, p) => s + p.rate, 0) / recent.length);
  }
  return Math.round(params.vehicleColumn);
}

function mapTripRowToHistory(row: {
  id: string;
  trip_id: string | null;
  trip_number: string | null;
  scheduled_date: string | null;
  driver_name: string | null;
  destinations: string[] | null;
  orders_count: number | null;
  status: string | null;
  delivery_success_rate: number | string | null;
}): TripHistoryRecord {
  const st = row.status ?? 'Completed';
  const status =
    st === 'Delayed' ? 'Delayed' : st === 'Failed' ? 'Failed' : st === 'Completed' ? 'Completed' : 'Completed';
  const dsr = row.delivery_success_rate;
  const deliverySuccessRate = dsr != null && dsr !== '' ? num(dsr) : undefined;
  const tripId = row.trip_id ?? null;
  const rowId = tripId ?? `hist-${row.id}`;
  return {
    id: rowId,
    tripId,
    tripNumber: row.trip_number ?? '—',
    date: (row.scheduled_date ?? '').slice(0, 10),
    driverName: row.driver_name ?? '',
    driverId: '',
    route: row.destinations ?? [],
    ordersCount: int(row.orders_count),
    distance: 0,
    duration: '—',
    status,
    fuelUsed: 0,
    fuelCost: 0,
    revenue: 0,
    deliverySuccessRate,
  };
}

function mapMaintRow(row: {
  id: string;
  category: string;
  description: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | string | null;
  vendor: string | null;
  status: string | null;
  notes: string | null;
}): MaintenanceRecord {
  const cat = row.category as MaintenanceRecord['category'];
  const scheduledDate = row.scheduled_date ? row.scheduled_date.slice(0, 10) : undefined;
  const completedDate = row.completed_date ? row.completed_date.slice(0, 10) : undefined;
  return {
    id: row.id,
    date: (completedDate ?? scheduledDate ?? '') || '—',
    type: row.description ?? row.category,
    category: cat,
    cost: num(row.cost),
    serviceProvider: row.vendor ?? '',
    mileage: 0,
    notes: row.notes ?? '',
    nextDue: undefined,
    scheduledDate,
    completedDate,
    dbStatus: row.status ?? 'Scheduled',
  };
}

export function calendarBookingsFromTripHistory(trips: TripHistoryRecord[]): CalendarBooking[] {
  return trips.map((t) => ({
    date: t.date,
    type: 'Trip' as const,
    tripId: t.tripId ?? undefined,
    tripNumber: t.tripNumber,
    status: t.status,
    driver: t.driverName,
  }));
}

function buildTruckAlerts(truck: VehicleRow): TruckAlert[] {
  const out: TruckAlert[] = [];
  let i = 0;
  for (const a of truck.alerts ?? []) {
    out.push({
      id: `db-a-${i++}`,
      type: 'Warning',
      category: 'Performance',
      message: a,
      date: new Date().toISOString().slice(0, 10),
      resolved: false,
    });
  }
  return out;
}

// --- Add / edit trucks ---

export type TruckFormPayload = {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  /** Only used when editing; new trucks are always stored as Available. */
  status: Vehicle['status'];
  /** Raw input; empty trims to DB default 0 after validate on save. */
  maxWeightKg: string;
  maxVolumeCbm: string;
  maintenanceDue: string;
  notesText: string;
  make: string;
  model: string;
  yearModel: string;
  color: string;
  orcrNumber: string;
  registrationExpiry: string;
  currentOdometerKm: string;
  engine: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  /** LTO / first registration date (YYYY-MM-DD); shown as “Registered”. */
  registrationRecordedDate: string;
  /** Company acquisition date (YYYY-MM-DD). */
  acquisitionDate: string;
  /** Must match `branches.name` on save (moves truck between branches when updated). */
  branchName: string;
};

export function emptyTruckForm(): TruckFormPayload {
  const y = new Date().getFullYear();
  return {
    vehicleId: '',
    vehicleName: '',
    plateNumber: '',
    status: 'Available',
    maxWeightKg: '',
    maxVolumeCbm: '',
    maintenanceDue: '',
    notesText: '',
    make: '',
    model: '',
    yearModel: String(y),
    color: '',
    orcrNumber: '',
    registrationExpiry: '',
    currentOdometerKm: '',
    engine: '',
    lengthM: '',
    widthM: '',
    heightM: '',
    registrationRecordedDate: '',
    acquisitionDate: '',
    branchName: '',
  };
}

export function vehicleRowToTruckForm(v: VehicleRow): TruckFormPayload {
  return {
    vehicleId: v.vehicle_id,
    vehicleName: v.vehicle_name,
    plateNumber: v.plate_number ?? '',
    status: v.status,
    maxWeightKg: v.max_weight_kg != null && v.max_weight_kg !== '' ? String(v.max_weight_kg) : '',
    maxVolumeCbm: v.max_volume_cbm != null && v.max_volume_cbm !== '' ? String(v.max_volume_cbm) : '',
    maintenanceDue: fmtDate(v.maintenance_due) ?? '',
    notesText: (v.alerts ?? []).join('\n'),
    make: v.make ?? '',
    model: v.model ?? '',
    yearModel: v.year_model != null ? String(v.year_model) : '',
    color: v.color ?? '',
    orcrNumber: v.orcr_number ?? '',
    registrationExpiry: fmtDate(v.registration_expiry) ?? '',
    currentOdometerKm: v.current_odometer_km != null && v.current_odometer_km !== '' ? String(v.current_odometer_km) : '',
    engine: v.engine_type ?? '',
    lengthM: v.vehicle_length_m != null && v.vehicle_length_m !== '' ? String(v.vehicle_length_m) : '',
    widthM: v.vehicle_width_m != null && v.vehicle_width_m !== '' ? String(v.vehicle_width_m) : '',
    heightM: v.vehicle_height_m != null && v.vehicle_height_m !== '' ? String(v.vehicle_height_m) : '',
    registrationRecordedDate:
      fmtDate(v.date_first_registered) ?? fmtDate(v.created_at) ?? '',
    acquisitionDate: fmtDate(v.date_acquired) ?? fmtDate(v.created_at) ?? '',
    branchName: v.branches?.name ?? '',
  };
}

function notesFromText(text: string): string[] | null {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.length ? lines : null;
}

type TruckFormNumericFields = {
  maxWeightKg: number;
  maxVolumeCbm: number;
  currentOdometerKm: number;
  lengthM: number | null;
  widthM: number | null;
  heightM: number | null;
};

function parseOptionalNonNegNumber(
  label: string,
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === '') return { ok: true, value: 0 };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${label} must be empty or a non-negative number.` };
  }
  return { ok: true, value: n };
}

function parseOptionalNonNegNumberOrNull(
  label: string,
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${label} must be empty or a non-negative number.` };
  }
  return { ok: true, value: n };
}

function parseTruckFormNumericFields(
  form: TruckFormPayload,
): { ok: true; nums: TruckFormNumericFields } | { ok: false; error: string } {
  const w = parseOptionalNonNegNumber('Max weight (kg)', form.maxWeightKg);
  if (!w.ok) return w as { ok: false; error: string };
  const v = parseOptionalNonNegNumber('Max volume (m³)', form.maxVolumeCbm);
  if (!v.ok) return v as { ok: false; error: string };
  const o = parseOptionalNonNegNumber('Total distance (km)', form.currentOdometerKm);
  if (!o.ok) return o as { ok: false; error: string };
  const l = parseOptionalNonNegNumberOrNull('Length (m)', form.lengthM);
  if (!l.ok) return l as { ok: false; error: string };
  const wDim = parseOptionalNonNegNumberOrNull('Width (m)', form.widthM);
  if (!wDim.ok) return wDim as { ok: false; error: string };
  const h = parseOptionalNonNegNumberOrNull('Height (m)', form.heightM);
  if (!h.ok) return h as { ok: false; error: string };
  return {
    ok: true,
    nums: {
      maxWeightKg: w.value,
      maxVolumeCbm: v.value,
      currentOdometerKm: o.value,
      lengthM: l.value,
      widthM: wDim.value,
      heightM: h.value,
    },
  };
}

function formToDbRow(
  form: TruckFormPayload,
  branchId: string,
  opts: { isCreate: boolean },
  nums: TruckFormNumericFields,
) {
  const yearModel = parseInt(form.yearModel.trim(), 10);
  const vehicleId = form.vehicleId.trim().toUpperCase();
  const row: Record<string, unknown> = {
    vehicle_id: vehicleId,
    vehicle_name: form.vehicleName.trim(),
    plate_number: form.plateNumber.trim() || null,
    type: 'Truck',
    max_weight_kg: nums.maxWeightKg,
    max_volume_cbm: nums.maxVolumeCbm,
    maintenance_due: form.maintenanceDue.trim() || null,
    alerts: notesFromText(form.notesText),
    make: form.make.trim() || null,
    model: form.model.trim() || null,
    year_model: Number.isFinite(yearModel) ? yearModel : null,
    color: form.color.trim() || null,
    orcr_number: form.orcrNumber.trim() || null,
    registration_expiry: form.registrationExpiry.trim() || null,
    current_odometer_km: nums.currentOdometerKm,
    engine_type: form.engine.trim() || null,
    vehicle_length_m: nums.lengthM,
    vehicle_width_m: nums.widthM,
    vehicle_height_m: nums.heightM,
    date_first_registered: form.registrationRecordedDate.trim() || null,
    date_acquired: form.acquisitionDate.trim() || null,
    branch_id: branchId,
    updated_at: new Date().toISOString(),
  };

  if (opts.isCreate) {
    row.status = 'Available';
    row.financing_status = 'Owned';
    row.utilization_percent = 0;
    row.trips_today = 0;
  } else {
    row.status = form.status;
  }

  return row as Record<string, unknown>;
}

export async function createTruck(
  branchName: string,
  form: TruckFormPayload,
): Promise<{ ok: boolean; error?: string }> {
  const bname = form.branchName.trim() || branchName.trim();
  const bid = await resolveBranchIdByName(bname);
  if (!bid) return { ok: false, error: 'Could not find a branch with that name.' };
  const code = form.vehicleId.trim().toUpperCase();
  if (!code || !form.vehicleName.trim()) {
    return { ok: false, error: 'Vehicle code and name are required.' };
  }
  const parsed = parseTruckFormNumericFields(form);
  if (!parsed.ok) return { ok: false, error: (parsed as { ok: false; error: string }).error };
  const row = formToDbRow(form, bid, { isCreate: true }, parsed.nums);
  const { error } = await supabase.from('vehicles').insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateTruck(
  vehicleUuid: string,
  form: TruckFormPayload,
): Promise<{ ok: boolean; error?: string }> {
  const id = vehicleUuid.trim();
  const { data: existing, error: e0 } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', id)
    .eq('type', 'Truck')
    .maybeSingle();
  if (e0) return { ok: false, error: e0.message };
  if (!existing) return { ok: false, error: 'Truck not found.' };
  if (!form.vehicleName.trim()) return { ok: false, error: 'Vehicle name is required.' };
  const code = form.vehicleId.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Vehicle code is required.' };
  const parsed = parseTruckFormNumericFields(form);
  if (!parsed.ok) return { ok: false, error: (parsed as { ok: false; error: string }).error };

  const bid = await resolveBranchIdByName(form.branchName.trim());
  if (!bid) return { ok: false, error: 'Could not find a branch with that name.' };

  const row = formToDbRow(form, bid, { isCreate: false }, parsed.nums);
  const { error } = await supabase.from('vehicles').update(row).eq('id', id).eq('type', 'Truck');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchTruckFormById(
  vehicleUuid: string,
): Promise<{ form: TruckFormPayload | null; error?: string }> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('id', vehicleUuid.trim())
    .eq('type', 'Truck')
    .maybeSingle();
  if (error) return { form: null, error: error.message };
  if (!data) return { form: null };
  return { form: vehicleRowToTruckForm(data as VehicleRow) };
}

/** Full detail for `TruckDetailPage` from Supabase (vehicle primary key UUID). */
export async function fetchTruckDetailBundle(vehicleUuid: string): Promise<{
  truck: TruckDetails | null;
  tripHistory: TripHistoryRecord[];
  maintenanceHistory: MaintenanceRecord[];
  alerts: TruckAlert[];
  calendarBookings: CalendarBooking[];
  editForm: TruckFormPayload | null;
  error?: string;
}> {
  const { data: vrow, error: e1 } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('id', vehicleUuid.trim())
    .eq('type', 'Truck')
    .maybeSingle();

  if (e1) {
    return {
      truck: null,
      tripHistory: [],
      maintenanceHistory: [],
      alerts: [],
      calendarBookings: [],
      editForm: null,
      error: e1.message,
    };
  }

  if (!vrow || vrow.type !== 'Truck') {
    return { truck: null, tripHistory: [], maintenanceHistory: [], alerts: [], calendarBookings: [], editForm: null };
  }

  const v = vrow as VehicleRow;
  const mw = num(v.max_weight_kg);
  const mv = num(v.max_volume_cbm);
  const odo = int(v.current_odometer_km);

  const [{ data: th }, { data: mr }, { data: liveTrips }] = await Promise.all([
    supabase
      .from('trip_history')
      .select(
        'id, trip_id, trip_number, scheduled_date, driver_name, destinations, orders_count, status, delivery_success_rate',
      )
      .eq('vehicle_id', vehicleUuid.trim())
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('maintenance_records')
      .select(
        'id, category, description, scheduled_date, completed_date, cost, vendor, status, notes',
      )
      .eq('vehicle_id', vehicleUuid.trim())
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('trips')
      .select(
        'id, trip_number, scheduled_date, driver_id, driver_name, destinations, order_ids, status, capacity_used_percent',
      )
      .eq('vehicle_id', vehicleUuid.trim())
      .order('scheduled_date', { ascending: false }),
  ]);

  type LiveTripRow = Parameters<typeof liveTripRowToHistoryRecord>[0];
  type HistRow = Parameters<typeof mapTripRowToHistory>[0];

  const liveRows = (liveTrips ?? []) as LiveTripRow[];
  const liveById = new Set(liveRows.map((t) => t.id));
  const histRows = (th ?? []) as HistRow[];
  const histOnly = histRows.filter((h) => {
    const tid = h.trip_id;
    if (tid == null || tid === '') return true;
    return !liveById.has(tid);
  });

  const fromLive = liveRows.map(liveTripRowToHistoryRecord);
  const fromHist = histOnly.map(mapTripRowToHistory);
  const tripHistory = [...fromLive, ...fromHist].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return (b.tripNumber || '').localeCompare(a.tripNumber || '');
  });

  const terminalLive = liveRows.filter((t) => TRIP_DB_TERMINAL.has(String(t.status ?? ''))).length;
  const terminalHist = histOnly.filter((h) => TRIP_DB_TERMINAL.has(String(h.status ?? ''))).length;
  const totalTripsCounted = terminalLive + terminalHist;

  const utilizationPercent = computeTruckUtilizationDisplay({
    liveTrips: liveRows,
    histOnly,
    vehicleColumn: num(v.utilization_percent),
  });
  const maintenanceHistory = (mr ?? []).map((r) =>
    mapMaintRow(r as Parameters<typeof mapMaintRow>[0]),
  );

  let currentTrip: string | undefined;
  if (v.current_trip_id) {
    const { data: tr } = await supabase
      .from('trips')
      .select('trip_number')
      .eq('id', v.current_trip_id)
      .maybeSingle();
    currentTrip = (tr?.trip_number as string) ?? undefined;
  }

  const lastMaint = maintenanceHistory[0];
  const truck: TruckDetails = {
    id: v.id,
    vehicleId: v.vehicle_id,
    vehicleName: v.vehicle_name,
    plateNumber: v.plate_number ?? '',
    type: 'Truck',
    status: v.status,
    make: v.make ?? '—',
    model: v.model ?? '—',
    yearModel: int(v.year_model, new Date().getFullYear()),
    color: v.color ?? '—',
    engineType: (v.engine_type && String(v.engine_type).trim()) || '—',
    maxWeight: mw,
    maxVolume: mv,
    dimensions: {
      length:
        v.vehicle_length_m != null && v.vehicle_length_m !== ''
          ? num(v.vehicle_length_m)
          : null,
      width:
        v.vehicle_width_m != null && v.vehicle_width_m !== ''
          ? num(v.vehicle_width_m)
          : null,
      height:
        v.vehicle_height_m != null && v.vehicle_height_m !== ''
          ? num(v.vehicle_height_m)
          : null,
    },
    registrationDate:
      fmtDate(v.date_first_registered) ?? fmtDate(v.created_at) ?? '—',
    registrationExpiry: fmtDate(v.registration_expiry) ?? '—',
    orcrNumber: v.orcr_number ?? '—',
    acquisitionDate: fmtDate(v.date_acquired) ?? fmtDate(v.created_at) ?? '—',
    purchasePrice: 0,
    currentBookValue: 0,
    branch: v.branches?.name ?? '—',
    lastMaintenanceDate: lastMaint?.date ?? '—',
    nextMaintenanceDue: fmtDate(v.maintenance_due) ?? maintenanceHistory.find((m) => m.nextDue)?.nextDue ?? '—',
    totalDistance: odo,
    mileageAtLastMaintenance: Math.max(0, odo - 2000),
    totalTrips: totalTripsCounted,
    utilizationPercent,
    nextAvailableTime: fmtDateTime(v.next_available_time),
    currentTrip,
  };

  const alerts = buildTruckAlerts(v);
  const calendarBookings = calendarBookingsFromTripHistory(tripHistory);
  const editForm = vehicleRowToTruckForm(v);

  return { truck, tripHistory, maintenanceHistory, alerts, calendarBookings, editForm };
}

// ─── Maintenance Actions ──────────────────────────────────────────────────────

export type ScheduleMaintenancePayload = {
  description: string;
  scheduledDate: string; // YYYY-MM-DD
};

/**
 * Insert a new scheduled maintenance record and update vehicles.maintenance_due
 * to the earliest upcoming (non-completed) scheduled date.
 */
export async function scheduleMaintenance(
  vehicleUuid: string,
  data: ScheduleMaintenancePayload,
): Promise<{ ok: boolean; error?: string }> {
  const { error: insertError } = await supabase.from('maintenance_records').insert({
    vehicle_id: vehicleUuid,
    description: data.description.trim(),
    scheduled_date: data.scheduledDate,
    status: 'Scheduled',
  });
  if (insertError) return { ok: false, error: insertError.message };

  // Refresh vehicles.maintenance_due to the nearest upcoming scheduled record
  await _refreshVehicleMaintenanceDue(vehicleUuid);
  return { ok: true };
}

export type ConfirmMaintenancePayload = {
  completedDate: string; // YYYY-MM-DD
  notes?: string;
};

/**
 * Mark a maintenance record as Completed, record the completion date,
 * then update vehicles.maintenance_due to the next upcoming record.
 */
export async function confirmMaintenance(
  recordId: string,
  vehicleUuid: string,
  data: ConfirmMaintenancePayload,
): Promise<{ ok: boolean; error?: string }> {
  const { error: updateError } = await supabase
    .from('maintenance_records')
    .update({
      status: 'Completed',
      completed_date: data.completedDate,
      notes: data.notes?.trim() || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);
  if (updateError) return { ok: false, error: updateError.message };

  await _refreshVehicleMaintenanceDue(vehicleUuid);
  return { ok: true };
}

/** Internal: set vehicles.maintenance_due to the nearest upcoming non-completed scheduled_date. */
async function _refreshVehicleMaintenanceDue(vehicleUuid: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: next } = await supabase
    .from('maintenance_records')
    .select('scheduled_date')
    .eq('vehicle_id', vehicleUuid)
    .neq('status', 'Completed')
    .not('scheduled_date', 'is', null)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from('vehicles')
    .update({
      maintenance_due: (next as { scheduled_date: string } | null)?.scheduled_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleUuid);
}
