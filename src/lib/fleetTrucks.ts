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


function mapTripRowToHistory(row: {
  id: string;
  trip_number: string | null;
  scheduled_date: string | null;
  driver_name: string | null;
  destinations: string[] | null;
  orders_count: number | null;
  status: string | null;
  delivery_success_rate: number | string | null;
}): TripHistoryRecord {
  const st = row.status ?? 'Completed';
  const status: TripHistoryRecord['status'] =
    st === 'Delayed' || st === 'Failed' ? st : 'Completed';
  const dsr = row.delivery_success_rate;
  const deliverySuccessRate =
    dsr != null && dsr !== '' ? num(dsr) : undefined;
  return {
    id: row.id,
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
  return {
    id: row.id,
    date: (row.completed_date ?? row.scheduled_date ?? '').slice(0, 10) || '—',
    type: row.category,
    category: cat,
    cost: num(row.cost),
    serviceProvider: row.vendor ?? '',
    mileage: 0,
    notes: row.description ?? '',
    nextDue: row.notes ?? undefined,
  };
}

export function calendarBookingsFromTripHistory(trips: TripHistoryRecord[]): CalendarBooking[] {
  return trips.map((t) => ({
    date: t.date,
    type: 'Trip' as const,
    tripId: t.id,
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
  if (!w.ok) return w;
  const v = parseOptionalNonNegNumber('Max volume (m³)', form.maxVolumeCbm);
  if (!v.ok) return v;
  const o = parseOptionalNonNegNumber('Total distance (km)', form.currentOdometerKm);
  if (!o.ok) return o;
  const l = parseOptionalNonNegNumberOrNull('Length (m)', form.lengthM);
  if (!l.ok) return l;
  const wDim = parseOptionalNonNegNumberOrNull('Width (m)', form.widthM);
  if (!wDim.ok) return wDim;
  const h = parseOptionalNonNegNumberOrNull('Height (m)', form.heightM);
  if (!h.ok) return h;
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
  if (!parsed.ok) return { ok: false, error: parsed.error };
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
  if (!parsed.ok) return { ok: false, error: parsed.error };

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

  const [{ data: th }, { data: mr }] = await Promise.all([
    supabase
      .from('trip_history')
      .select(
        'id, trip_number, scheduled_date, driver_name, destinations, orders_count, status, delivery_success_rate',
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
  ]);

  const tripHistory = (th ?? []).map((r) =>
    mapTripRowToHistory(r as Parameters<typeof mapTripRowToHistory>[0]),
  );
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
    totalTrips: tripHistory.length,
    utilizationPercent: Math.round(num(v.utilization_percent)),
    nextAvailableTime: fmtDateTime(v.next_available_time),
    currentTrip,
  };

  const alerts = buildTruckAlerts(v);
  const calendarBookings = calendarBookingsFromTripHistory(tripHistory);
  const editForm = vehicleRowToTruckForm(v);

  return { truck, tripHistory, maintenanceHistory, alerts, calendarBookings, editForm };
}
