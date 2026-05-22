import { supabase } from './supabase';
import { resolveBranchIdByName } from './branchCompanySettings';
import { csvDateOnlyIso } from './datePeriodQuery';

function xlsxOptionalNumber(v: number | string | null | undefined): number | '' {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : '';
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  return csvDateOnlyIso(d);
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

type VehicleRow = {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  plate_number: string | null;
  status: string;
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
  branches?: { name: string } | null;
};

export interface FleetVehicleExportRow {
  vehicle_code: string;
  vehicle_name: string;
  plate_number: string;
  branch: string;
  status: string;
  financing_status: string;
  current_trip: string;
  trips_today: number;
  utilization_percent: number;
  next_available_time: string;
  maintenance_due: string;
  max_weight_kg: number | '';
  max_volume_cbm: number | '';
  make: string;
  model: string;
  year_model: number | '';
  color: string;
  orcr_number: string;
  registration_expiry: string;
  current_odometer_km: number | '';
  engine_type: string;
  length_m: number | '';
  width_m: number | '';
  height_m: number | '';
  date_first_registered: string;
  date_acquired: string;
  notes: string;
  total_trips: number;
}

export interface FleetTripExportRow {
  vehicle_code: string;
  vehicle_name: string;
  trip_number: string;
  scheduled_date: string;
  driver_name: string;
  destinations: string;
  orders_count: number;
  status: string;
  capacity_used_percent: number | '';
  record_source: string;
}

export interface FleetMaintenanceExportRow {
  vehicle_code: string;
  vehicle_name: string;
  category: string;
  description: string;
  scheduled_date: string;
  completed_date: string;
  status: string;
  notes: string;
}

export interface FleetExportBundle {
  branchLabel: string;
  generatedAt: string;
  vehicles: FleetVehicleExportRow[];
  trips: FleetTripExportRow[];
  maintenance: FleetMaintenanceExportRow[];
}

const TRIP_TERMINAL = new Set(['Completed', 'Failed', 'Delayed']);

export async function fetchFleetExportBundle(branchName: string): Promise<FleetExportBundle> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) throw new Error('Could not resolve branch for fleet export.');

  const { data: vehicleData, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('branch_id', bid)
    .eq('type', 'Truck')
    .order('vehicle_id', { ascending: true });

  if (vehicleError) throw new Error(vehicleError.message);

  const rows = (vehicleData ?? []) as VehicleRow[];
  const vehicleIds = rows.map((r) => r.id);
  const tripIdSet = new Set(rows.map((r) => r.current_trip_id).filter(Boolean) as string[]);

  const tripNumberById = new Map<string, string>();
  if (tripIdSet.size) {
    const { data: tripNums } = await supabase
      .from('trips')
      .select('id, trip_number')
      .in('id', [...tripIdSet]);
    for (const t of tripNums ?? []) {
      tripNumberById.set(t.id as string, String(t.trip_number ?? ''));
    }
  }

  const vehicleMeta = new Map(rows.map((r) => [r.id, { code: r.vehicle_id, name: r.vehicle_name }]));

  let liveTrips: {
    id: string;
    vehicle_id: string;
    trip_number: string | null;
    scheduled_date: string | null;
    driver_name: string | null;
    destinations: string[] | null;
    order_ids: string[] | null;
    status: string | null;
    capacity_used_percent: number | string | null;
  }[] = [];

  let histTrips: {
    id: string;
    trip_id: string | null;
    vehicle_id: string;
    trip_number: string | null;
    scheduled_date: string | null;
    driver_name: string | null;
    destinations: string[] | null;
    orders_count: number | null;
    status: string | null;
    delivery_success_rate: number | string | null;
  }[] = [];

  let maintRows: {
    vehicle_id: string;
    category: string;
    description: string | null;
    scheduled_date: string | null;
    completed_date: string | null;
    status: string | null;
    notes: string | null;
  }[] = [];

  if (vehicleIds.length) {
    const [{ data: live }, { data: hist }, { data: maint }] = await Promise.all([
      supabase
        .from('trips')
        .select(
          'id, vehicle_id, trip_number, scheduled_date, driver_name, destinations, order_ids, status, capacity_used_percent',
        )
        .in('vehicle_id', vehicleIds)
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('trip_history')
        .select(
          'id, trip_id, vehicle_id, trip_number, scheduled_date, driver_name, destinations, orders_count, status, delivery_success_rate',
        )
        .in('vehicle_id', vehicleIds)
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('maintenance_records')
        .select(
          'vehicle_id, category, description, scheduled_date, completed_date, status, notes',
        )
        .in('vehicle_id', vehicleIds)
        .order('scheduled_date', { ascending: false }),
    ]);

    liveTrips = (live ?? []) as typeof liveTrips;
    histTrips = (hist ?? []) as typeof histTrips;
    maintRows = (maint ?? []) as typeof maintRows;
  }

  const liveById = new Set(liveTrips.map((t) => t.id));
  const tripCountByVehicle = new Map<string, number>();
  for (const t of liveTrips) {
    if (!TRIP_TERMINAL.has(String(t.status ?? ''))) continue;
    tripCountByVehicle.set(t.vehicle_id, (tripCountByVehicle.get(t.vehicle_id) ?? 0) + 1);
  }
  for (const h of histTrips) {
    const tid = h.trip_id;
    if (tid && liveById.has(tid)) continue;
    if (!TRIP_TERMINAL.has(String(h.status ?? ''))) continue;
    tripCountByVehicle.set(h.vehicle_id, (tripCountByVehicle.get(h.vehicle_id) ?? 0) + 1);
  }

  const vehicles: FleetVehicleExportRow[] = rows.map((r) => {
    const currentTrip = r.current_trip_id ? tripNumberById.get(r.current_trip_id) ?? '' : '';
    return {
      vehicle_code: r.vehicle_id,
      vehicle_name: r.vehicle_name,
      plate_number: r.plate_number ?? '',
      branch: r.branches?.name ?? branchName,
      status: r.status,
      financing_status: String(r.financing_status ?? ''),
      current_trip: currentTrip,
      trips_today: Number(r.trips_today) || 0,
      utilization_percent: Math.round(Number(r.utilization_percent) || 0),
      next_available_time: fmtDateTime(r.next_available_time),
      maintenance_due: fmtDate(r.maintenance_due),
      max_weight_kg: xlsxOptionalNumber(r.max_weight_kg),
      max_volume_cbm: xlsxOptionalNumber(r.max_volume_cbm),
      make: r.make ?? '',
      model: r.model ?? '',
      year_model: xlsxOptionalNumber(r.year_model),
      color: r.color ?? '',
      orcr_number: r.orcr_number ?? '',
      registration_expiry: fmtDate(r.registration_expiry),
      current_odometer_km: xlsxOptionalNumber(r.current_odometer_km),
      engine_type: r.engine_type ?? '',
      length_m: xlsxOptionalNumber(r.vehicle_length_m),
      width_m: xlsxOptionalNumber(r.vehicle_width_m),
      height_m: xlsxOptionalNumber(r.vehicle_height_m),
      date_first_registered: fmtDate(r.date_first_registered),
      date_acquired: fmtDate(r.date_acquired),
      notes: (r.alerts ?? []).join('; '),
      total_trips: tripCountByVehicle.get(r.id) ?? 0,
    };
  });

  const trips: FleetTripExportRow[] = [];
  for (const t of liveTrips) {
    const meta = vehicleMeta.get(t.vehicle_id);
    if (!meta) continue;
    trips.push({
      vehicle_code: meta.code,
      vehicle_name: meta.name,
      trip_number: t.trip_number ?? '',
      scheduled_date: fmtDate(t.scheduled_date),
      driver_name: t.driver_name ?? '',
      destinations: (t.destinations ?? []).join('; '),
      orders_count: (t.order_ids ?? []).filter(Boolean).length,
      status: t.status ?? '',
      capacity_used_percent: xlsxOptionalNumber(t.capacity_used_percent),
      record_source: 'Active trip',
    });
  }
  for (const h of histTrips) {
    const tid = h.trip_id;
    if (tid && liveById.has(tid)) continue;
    const meta = vehicleMeta.get(h.vehicle_id);
    if (!meta) continue;
    trips.push({
      vehicle_code: meta.code,
      vehicle_name: meta.name,
      trip_number: h.trip_number ?? '',
      scheduled_date: fmtDate(h.scheduled_date),
      driver_name: h.driver_name ?? '',
      destinations: (h.destinations ?? []).join('; '),
      orders_count: Number(h.orders_count) || 0,
      status: h.status ?? '',
      capacity_used_percent: xlsxOptionalNumber(h.delivery_success_rate),
      record_source: 'Trip history',
    });
  }
  trips.sort((a, b) => {
    const byDate = b.scheduled_date.localeCompare(a.scheduled_date);
    if (byDate !== 0) return byDate;
    return a.vehicle_code.localeCompare(b.vehicle_code, undefined, { numeric: true });
  });

  const maintenance: FleetMaintenanceExportRow[] = maintRows.map((m) => {
    const meta = vehicleMeta.get(m.vehicle_id);
    return {
      vehicle_code: meta?.code ?? '',
      vehicle_name: meta?.name ?? '',
      category: m.category ?? '',
      description: m.description ?? '',
      scheduled_date: fmtDate(m.scheduled_date),
      completed_date: fmtDate(m.completed_date),
      status: m.status ?? '',
      notes: m.notes ?? '',
    };
  });

  return {
    branchLabel: branchName,
    generatedAt: new Date().toISOString(),
    vehicles,
    trips,
    maintenance,
  };
}

export async function downloadFleetReportWorkbook(bundle: FleetExportBundle) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Vehicle Code',
        'Vehicle Name',
        'Plate Number',
        'Branch',
        'Status',
        'Financing',
        'Current Trip',
        'Trips Today',
        'Utilization (%)',
        'Next Available',
        'Maintenance Due',
        'Max Weight (kg)',
        'Max Volume (m³)',
        'Make',
        'Model',
        'Year',
        'Color',
        'OR/CR Number',
        'Registration Expiry',
        'Odometer (km)',
        'Engine',
        'Length (m)',
        'Width (m)',
        'Height (m)',
        'First Registered',
        'Date Acquired',
        'Total Trips',
        'Notes',
      ],
      ...bundle.vehicles.map((r) => [
        r.vehicle_code,
        r.vehicle_name,
        r.plate_number,
        r.branch,
        r.status,
        r.financing_status,
        r.current_trip,
        xlsxOptionalNumber(r.trips_today),
        xlsxOptionalNumber(r.utilization_percent),
        r.next_available_time,
        r.maintenance_due,
        r.max_weight_kg,
        r.max_volume_cbm,
        r.make,
        r.model,
        r.year_model,
        r.color,
        r.orcr_number,
        r.registration_expiry,
        r.current_odometer_km,
        r.engine_type,
        r.length_m,
        r.width_m,
        r.height_m,
        r.date_first_registered,
        r.date_acquired,
        xlsxOptionalNumber(r.total_trips),
        r.notes,
      ]),
    ]),
    'Vehicles',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Vehicle Code',
        'Vehicle Name',
        'Trip Number',
        'Scheduled Date',
        'Driver',
        'Destinations',
        'Orders',
        'Status',
        'Capacity Used (%)',
        'Source',
      ],
      ...bundle.trips.map((r) => [
        r.vehicle_code,
        r.vehicle_name,
        r.trip_number,
        r.scheduled_date,
        r.driver_name,
        r.destinations,
        xlsxOptionalNumber(r.orders_count),
        r.status,
        r.capacity_used_percent,
        r.record_source,
      ]),
    ]),
    'Trips',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'Vehicle Code',
        'Vehicle Name',
        'Category',
        'Description',
        'Scheduled Date',
        'Completed Date',
        'Status',
        'Notes',
      ],
      ...bundle.maintenance.map((r) => [
        r.vehicle_code,
        r.vehicle_name,
        r.category,
        r.description,
        r.scheduled_date,
        r.completed_date,
        r.status,
        r.notes,
      ]),
    ]),
    'Maintenance',
  );

  const safeBranch = bundle.branchLabel.replace(/[^\w.-]+/g, '_').slice(0, 40);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fleet-report-${safeBranch || 'export'}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
