/**
 * Logistics Manager Dashboard data layer.
 *
 * The logistics manager owns trip planning, fleet readiness, driver assignment
 * and delivery performance for their branch. Their day-to-day signals:
 *
 *   - Active trips (Loading / In Transit / Delayed) — what's moving right now
 *   - This week's schedule (trips with `scheduled_date` from today through +6 days)
 *   - Orders waiting to be dispatched (Approved / Partially Fulfilled, not on
 *     an active trip)
 *   - Fleet status breakdown (vehicles per status, maintenance due)
 *   - Driver availability
 *   - Open delay exceptions
 *   - Month dispatch calendar (loaded separately by `LogisticsDispatchCalendar`)
 *
 * Branch scope: a logistics manager works inside a single branch — we hard
 * resolve the branch UUID via `resolveBranchIdByName` and rely on `branch_id`
 * filters everywhere.
 */

import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import { parseDelayTypeFromReason } from '@/src/lib/orderTripDelay';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LogisticsKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
  href?: string;
}

export interface LogisticsTripRow {
  id: string;
  tripNumber: string;
  status: string;
  scheduledDate: string | null;
  departureTime: string | null;
  eta: string | null;
  vehicleUuid: string | null;
  vehicleName: string | null;
  plateNumber: string | null;
  driverUuid: string | null;
  driverName: string | null;
  destinations: string[];
  orderCount: number;
  capacityUsedPercent: number;
  weightUsedKg: number;
  volumeUsedCbm: number;
  maxWeightKg: number;
  maxVolumeCbm: number;
  delayReason: string | null;
}

export interface LogisticsOrderToDispatchRow {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  destination: string;
  requiredDate: string | null;
  daysUntilRequired: number | null;
  volumeCbm: number;
  weightKg: number;
  urgency: 'High' | 'Medium' | 'Low';
  status: string;
}

export interface LogisticsVehicleRow {
  id: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string | null;
  status: string;
  currentTripId: string | null;
  utilizationPercent: number;
  maintenanceDue: string | null;
  daysUntilMaintenance: number | null;
}

export interface LogisticsDriverRow {
  id: string;
  name: string;
  status: string;
  /** When non-null, the driver is locked to an active trip. */
  activeTripId: string | null;
  activeTripNumber: string | null;
}

export interface LogisticsDelayRow {
  id: string;
  type: string;
  affectedTripNumber: string | null;
  daysLate: number;
  status: string;
  owner: string | null;
  reportedDate: string | null;
  affectedOrders: number;
  customersAffected: number;
}

export interface LogisticsMaintenanceRow {
  id: string;
  vehicleUuid: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string | null;
  category: string;
  description: string;
  scheduledDate: string | null;
  daysUntilScheduled: number | null;
  status: string;
  vendor: string | null;
  cost: number;
}

export interface LogisticsFleetSummary {
  total: number;
  available: number;
  onTrip: number;
  loading: number;
  maintenance: number;
  outOfService: number;
}

export interface LogisticsDriverSummary {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  onActiveTrip: number;
  available: number;
}

export interface LogisticsDashboardBundle {
  branchId: string | null;
  branchName: string | null;
  generatedAt: string;
  kpis: LogisticsKPI[];

  weekSchedule: LogisticsTripRow[];
  weekScheduleCount: number;

  ordersAwaitingDispatch: LogisticsOrderToDispatchRow[];
  ordersAwaitingDispatchCount: number;

  delays: LogisticsDelayRow[];
  delayCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVE_TRIP_STATUSES = ['Loading', 'In Transit', 'Delayed'];

const ORDER_DISPATCH_STATUSES = ['Approved', 'Partially Fulfilled'];
const OPEN_DELAY_STATUSES = ['Open', 'In Progress', 'Escalated'];
const ACTIVE_MAINTENANCE_STATUSES = ['Scheduled', 'In Progress'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number') return String(v);
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diffDays(from: string | null | undefined, ref: Date): number | null {
  if (!from) return null;
  const d = new Date(from);
  if (!Number.isFinite(d.getTime())) return null;
  return Math.floor((startOfDay(d).getTime() - startOfDay(ref).getTime()) / 86_400_000);
}

function logDev(scope: string, err: unknown): void {
  if (import.meta.env.DEV) console.warn(`[logistics dashboard] ${scope}`, err);
}

// ---------------------------------------------------------------------------
// Sub-fetchers
// ---------------------------------------------------------------------------

const TRIP_SELECT_BASE = `
  id, trip_number, status, scheduled_date, departure_time, eta, actual_arrival, delay_reason,
  vehicle_id, vehicle_name, driver_id, driver_name, destinations, order_ids,
  capacity_used_percent, weight_used_kg, volume_used_cbm, max_weight_kg, max_volume_cbm
`;

/** @deprecated Prefer TRIP_SELECT_BASE — kept as alias for call sites. */
const TRIP_SELECT = TRIP_SELECT_BASE;

function tripOverlapsWeek(
  scheduledDate: string | null,
  eta: string | null,
  weekStart: string,
  weekEnd: string,
): boolean {
  const start = scheduledDate?.trim().slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return false;
  const end = (eta?.trim().slice(0, 10) || start);
  return start <= weekEnd && end >= weekStart;
}

function mapTripStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? '').trim();
  if (s === 'Planned') return 'Scheduled';
  if (s === 'Completed') return 'Complete';
  if (s === 'Failed') return 'Cancelled';
  return s || '—';
}

function mapTripRow(row: Record<string, unknown>): LogisticsTripRow {
  const destinations = (row.destinations as string[] | null) ?? [];
  const orderIds = (row.order_ids as string[] | null) ?? [];
  const rawStatus = toStr(row.status) ?? '—';

  return {
    id: String(row.id),
    tripNumber: toStr(row.trip_number) ?? String(row.id),
    status: mapTripStatusLabel(rawStatus),
    scheduledDate: toStr(row.scheduled_date)?.slice(0, 10) ?? null,
    departureTime: toStr(row.departure_time),
    eta: toStr(row.eta),
    vehicleUuid: toStr(row.vehicle_id),
    vehicleName: toStr(row.vehicle_name),
    plateNumber: null,
    driverUuid: toStr(row.driver_id),
    driverName: toStr(row.driver_name),
    destinations,
    orderCount: orderIds.length,
    capacityUsedPercent: toNumber(row.capacity_used_percent),
    weightUsedKg: toNumber(row.weight_used_kg),
    volumeUsedCbm: toNumber(row.volume_used_cbm),
    maxWeightKg: toNumber(row.max_weight_kg),
    maxVolumeCbm: toNumber(row.max_volume_cbm),
    delayReason: toStr(row.delay_reason),
  };
}

async function fetchActiveTrips(branchId: string | null): Promise<LogisticsTripRow[]> {
  if (!branchId) return [];
  try {
    const { data, error } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .eq('branch_id', branchId)
      .in('status', ACTIVE_TRIP_STATUSES)
      .order('scheduled_date', { ascending: true })
      .limit(20);
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map(mapTripRow);
  } catch (e) {
    logDev('active trips', e);
    return [];
  }
}

async function fetchWeekSchedule(branchId: string | null): Promise<LogisticsTripRow[]> {
  if (!branchId) return [];
  try {
    const start = isoDate(new Date());
    const endDt = new Date();
    endDt.setDate(endDt.getDate() + 6);
    const end = isoDate(endDt);

    // Pull trips that start on/before week end; filter overlap client-side so multi-day
    // container voyages (scheduled_date … eta) still appear in the window.
    const { data, error } = await supabase
      .from('trips')
      .select(TRIP_SELECT_BASE)
      .eq('branch_id', branchId)
      .lte('scheduled_date', end)
      .not('status', 'in', '("Completed","Failed")')
      .order('scheduled_date', { ascending: true })
      .order('departure_time', { ascending: true })
      .limit(100);

    if (error) throw error;

    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) =>
        tripOverlapsWeek(toStr(row.scheduled_date), toStr(row.eta), start, end),
      )
      .map(mapTripRow)
      .slice(0, 50);
  } catch (e) {
    logDev('week schedule', e);
    return [];
  }
}

async function fetchOrdersAwaitingDispatch(branchId: string | null): Promise<LogisticsOrderToDispatchRow[]> {
  if (!branchId) return [];
  try {
    // Active trips (any status holding orders) so we exclude already-assigned orders.
    const { data: tripRows, error: tripErr } = await supabase
      .from('trips')
      .select('order_ids, status')
      .eq('branch_id', branchId);
    if (tripErr) throw tripErr;

    const holdingStatuses = new Set(['Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delayed', 'Planned', 'Pending']);
    const assigned = new Set<string>();
    for (const t of tripRows ?? []) {
      if (!holdingStatuses.has(toStr((t as Record<string, unknown>).status) ?? '')) continue;
      const ids = ((t as Record<string, unknown>).order_ids as string[] | null) ?? [];
      for (const id of ids) if (id) assigned.add(id);
    }

    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, order_number, customer_id, customer_name, delivery_address, required_date, urgency, status,
         volume_cbm, weight_kg`,
      )
      .eq('branch_id', branchId)
      .in('status', ORDER_DISPATCH_STATUSES)
      .order('required_date', { ascending: true })
      .limit(50);

    if (error) throw error;

    const now = new Date();
    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((r) => !assigned.has(String(r.id)))
      .map((r) => {
        const urgRaw = toStr(r.urgency) ?? 'Medium';
        const urgency: 'High' | 'Medium' | 'Low' =
          urgRaw === 'High' || urgRaw === 'Critical' ? 'High' : urgRaw === 'Low' ? 'Low' : 'Medium';
        const dest = toStr(r.delivery_address)?.split(/[\n,]/)[0]?.trim()?.slice(0, 80) ?? toStr(r.customer_name) ?? '—';
        return {
          id: String(r.id),
          orderNumber: toStr(r.order_number) ?? String(r.id),
          customerId: toStr(r.customer_id),
          customerName: toStr(r.customer_name) ?? '—',
          destination: dest,
          requiredDate: toStr(r.required_date),
          daysUntilRequired: diffDays(toStr(r.required_date), now),
          volumeCbm: toNumber(r.volume_cbm),
          weightKg: toNumber(r.weight_kg),
          urgency,
          status: toStr(r.status) ?? '—',
        };
      })
      .slice(0, 8);
  } catch (e) {
    logDev('orders awaiting dispatch', e);
    return [];
  }
}

async function fetchFleetSnapshot(branchId: string | null): Promise<{
  vehicles: LogisticsVehicleRow[];
  summary: LogisticsFleetSummary;
}> {
  const emptySummary: LogisticsFleetSummary = {
    total: 0,
    available: 0,
    onTrip: 0,
    loading: 0,
    maintenance: 0,
    outOfService: 0,
  };
  if (!branchId) return { vehicles: [], summary: emptySummary };

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(
        'id, vehicle_id, vehicle_name, plate_number, type, status, current_trip_id, utilization_percent, maintenance_due',
      )
      .eq('branch_id', branchId)
      .order('vehicle_id', { ascending: true });
    if (error) throw error;

    const now = new Date();
    const vehicles: LogisticsVehicleRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      vehicleId: toStr(r.vehicle_id) ?? '—',
      vehicleName: toStr(r.vehicle_name) ?? '—',
      plateNumber: toStr(r.plate_number),
      status: toStr(r.status) ?? '—',
      currentTripId: toStr(r.current_trip_id),
      utilizationPercent: toNumber(r.utilization_percent),
      maintenanceDue: toStr(r.maintenance_due),
      daysUntilMaintenance: diffDays(toStr(r.maintenance_due), now),
    }));

    const summary: LogisticsFleetSummary = {
      total: vehicles.length,
      available: 0,
      onTrip: 0,
      loading: 0,
      maintenance: 0,
      outOfService: 0,
    };
    for (const v of vehicles) {
      switch (v.status) {
        case 'Available':
          summary.available += 1;
          break;
        case 'On Trip':
          summary.onTrip += 1;
          break;
        case 'Loading':
          summary.loading += 1;
          break;
        case 'Maintenance':
          summary.maintenance += 1;
          break;
        case 'Out of Service':
          summary.outOfService += 1;
          break;
        default:
          break;
      }
    }
    return { vehicles, summary };
  } catch (e) {
    logDev('fleet', e);
    return { vehicles: [], summary: emptySummary };
  }
}

async function fetchDriversSnapshot(
  branchId: string | null,
  activeTrips: LogisticsTripRow[],
): Promise<{ drivers: LogisticsDriverRow[]; summary: LogisticsDriverSummary }> {
  const emptySummary: LogisticsDriverSummary = {
    total: 0,
    active: 0,
    onLeave: 0,
    inactive: 0,
    onActiveTrip: 0,
    available: 0,
  };
  if (!branchId) return { drivers: [], summary: emptySummary };

  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_name, status')
      .eq('branch_id', branchId)
      .eq('role', 'Truck Driver')
      .order('employee_name');
    if (error) throw error;

    // Build a tripId-by-driverId map from active trips for the "currently on a trip" badge.
    // The `trips` row only has `driver_id` (UUID), not exposed here; we look it up directly.
    const driverIds = ((data ?? []) as Array<Record<string, unknown>>).map((r) => String(r.id));
    const activeByDriver = new Map<string, { tripId: string; tripNumber: string }>();
    if (driverIds.length > 0) {
      const { data: tripRows } = await supabase
        .from('trips')
        .select('id, trip_number, driver_id, status')
        .in('driver_id', driverIds)
        .in('status', ['Loading', 'In Transit', 'Delayed']);
      for (const t of (tripRows ?? []) as Array<Record<string, unknown>>) {
        const did = toStr(t.driver_id);
        if (!did) continue;
        activeByDriver.set(did, {
          tripId: String(t.id),
          tripNumber: toStr(t.trip_number) ?? String(t.id),
        });
      }
    }

    const drivers: LogisticsDriverRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const id = String(r.id);
      const active = activeByDriver.get(id);
      return {
        id,
        name: toStr(r.employee_name) ?? '—',
        status: toStr(r.status) ?? 'active',
        activeTripId: active?.tripId ?? null,
        activeTripNumber: active?.tripNumber ?? null,
      };
    });

    const summary: LogisticsDriverSummary = {
      total: drivers.length,
      active: 0,
      onLeave: 0,
      inactive: 0,
      onActiveTrip: 0,
      available: 0,
    };
    for (const d of drivers) {
      const s = (d.status ?? '').toLowerCase();
      if (s === 'active') summary.active += 1;
      else if (s === 'on-leave' || s === 'on_leave' || s === 'on leave') summary.onLeave += 1;
      else summary.inactive += 1;
      if (d.activeTripId) summary.onActiveTrip += 1;
    }
    summary.available = Math.max(0, summary.active - summary.onActiveTrip);

    // Surface drivers tied to active trips at the top so the manager can see who's busy.
    drivers.sort((a, b) => (a.activeTripId ? 0 : 1) - (b.activeTripId ? 0 : 1));
    // The activeTrips param keeps the parent caller honest about consistency but isn't otherwise needed.
    void activeTrips;
    return { drivers, summary };
  } catch (e) {
    logDev('drivers', e);
    return { drivers: [], summary: emptySummary };
  }
}

async function fetchOpenDelayExceptions(branchId: string | null): Promise<LogisticsDelayRow[]> {
  if (!branchId) return [];
  try {
    const [{ data: exceptionRows, error: exErr }, { data: delayedTrips, error: tripErr }] = await Promise.all([
      supabase
        .from('delay_exceptions')
        .select(
          'id, type, affected_trip, trip_id, days_late, owner, status, reported_date, affected_orders, customers_affected',
        )
        .eq('branch_id', branchId)
        .in('status', OPEN_DELAY_STATUSES)
        .order('reported_date', { ascending: false }),
      supabase
        .from('trips')
        .select('id, trip_number, delay_reason, order_ids, scheduled_date, driver_name, updated_at')
        .eq('branch_id', branchId)
        .eq('status', 'Delayed'),
    ]);
    if (exErr) throw exErr;
    if (tripErr) throw tripErr;

    const rows: LogisticsDelayRow[] = ((exceptionRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      type: toStr(r.type) ?? '—',
      affectedTripNumber: toStr(r.affected_trip),
      daysLate: toNumber(r.days_late),
      status: toStr(r.status) ?? '—',
      owner: toStr(r.owner),
      reportedDate: toStr(r.reported_date),
      affectedOrders: Array.isArray(r.affected_orders) ? (r.affected_orders as unknown[]).length : 0,
      customersAffected: Array.isArray(r.customers_affected) ? (r.customers_affected as unknown[]).length : 0,
    }));

    const coveredTripIds = new Set(
      ((exceptionRows ?? []) as Array<Record<string, unknown>>)
        .map((r) => toStr(r.trip_id))
        .filter(Boolean) as string[],
    );

    const uncoveredTrips = ((delayedTrips ?? []) as Array<Record<string, unknown>>).filter(
      (t) => !coveredTripIds.has(String(t.id)),
    );

    if (uncoveredTrips.length > 0) {
      const orderIds = [
        ...new Set(
          uncoveredTrips.flatMap((t) =>
            Array.isArray(t.order_ids) ? (t.order_ids as unknown[]).map(String).filter(Boolean) : [],
          ),
        ),
      ];
      const orderMeta = new Map<string, { orderNumber: string; customerName: string }>();
      if (orderIds.length) {
        const { data: orderRows } = await supabase
          .from('orders')
          .select('id, order_number, customer_name')
          .in('id', orderIds);
        for (const o of (orderRows ?? []) as Array<Record<string, unknown>>) {
          orderMeta.set(String(o.id), {
            orderNumber: toStr(o.order_number) ?? '—',
            customerName: toStr(o.customer_name) ?? '—',
          });
        }
      }

      const today = isoDate(new Date());
      for (const t of uncoveredTrips) {
        const tripId = String(t.id);
        const orderIdList = Array.isArray(t.order_ids)
          ? (t.order_ids as unknown[]).map(String).filter(Boolean)
          : [];
        const orderNumbers = orderIdList.map((id) => orderMeta.get(id)?.orderNumber ?? id);
        const customerNames = [
          ...new Set(orderIdList.map((id) => orderMeta.get(id)?.customerName).filter(Boolean) as string[]),
        ];
        const scheduled = toStr(t.scheduled_date);
        let daysLate = 0;
        if (scheduled) {
          const sched = new Date(`${scheduled}T12:00:00`);
          const now = new Date(`${today}T12:00:00`);
          daysLate = Math.max(0, Math.floor((now.getTime() - sched.getTime()) / 86_400_000));
        }
        const delayReason = toStr(t.delay_reason) ?? '';
        rows.push({
          id: `trip-${tripId}`,
          type: delayReason ? parseDelayTypeFromReason(delayReason) : 'Other',
          affectedTripNumber: toStr(t.trip_number),
          daysLate,
          status: 'Open',
          owner: toStr(t.driver_name),
          reportedDate: toStr(t.updated_at)?.slice(0, 10) ?? today,
          affectedOrders: orderNumbers.length,
          customersAffected: customerNames.length,
        });
      }
    }

    rows.sort((a, b) => (b.reportedDate ?? '').localeCompare(a.reportedDate ?? ''));
    return rows;
  } catch (e) {
    logDev('delay exceptions', e);
    return [];
  }
}

async function fetchUpcomingMaintenance(
  branchId: string | null,
): Promise<{ rows: LogisticsMaintenanceRow[]; overdueCount: number }> {
  if (!branchId) return { rows: [], overdueCount: 0 };
  try {
    // Fetch branch vehicle IDs first; maintenance_records doesn't have branch_id.
    const { data: vehicleRows, error: vErr } = await supabase
      .from('vehicles')
      .select('id, vehicle_id, vehicle_name, plate_number')
      .eq('branch_id', branchId);
    if (vErr) throw vErr;

    const vehicleIds = ((vehicleRows ?? []) as Array<Record<string, unknown>>).map((r) => String(r.id));
    if (vehicleIds.length === 0) return { rows: [], overdueCount: 0 };

    const vehicleMap = new Map<string, Record<string, unknown>>();
    for (const v of (vehicleRows ?? []) as Array<Record<string, unknown>>) {
      vehicleMap.set(String(v.id), v);
    }

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, category, description, scheduled_date, status, vendor, cost')
      .in('vehicle_id', vehicleIds)
      .in('status', ACTIVE_MAINTENANCE_STATUSES)
      .order('scheduled_date', { ascending: true })
      .limit(20);
    if (error) throw error;

    const now = new Date();
    let overdueCount = 0;
    const rows: LogisticsMaintenanceRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const days = diffDays(toStr(r.scheduled_date), now);
      const status = toStr(r.status) ?? '—';
      if (days != null && days < 0 && status !== 'Completed') overdueCount += 1;
      const vehicleId = String(r.vehicle_id);
      const vehicleRow = vehicleMap.get(vehicleId);
      return {
        id: String(r.id),
        vehicleUuid: vehicleId,
        vehicleId: toStr(vehicleRow?.vehicle_id) ?? '—',
        vehicleName: toStr(vehicleRow?.vehicle_name) ?? '—',
        plateNumber: toStr(vehicleRow?.plate_number),
        category: toStr(r.category) ?? '—',
        description: toStr(r.description) ?? '—',
        scheduledDate: toStr(r.scheduled_date),
        daysUntilScheduled: days,
        status,
        vendor: toStr(r.vendor),
        cost: toNumber(r.cost),
      };
    });

    return { rows, overdueCount };
  } catch (e) {
    logDev('maintenance', e);
    return { rows: [], overdueCount: 0 };
  }
}

// ---------------------------------------------------------------------------
// KPI builder
// ---------------------------------------------------------------------------

function buildKpis(opts: {
  weekScheduled: number;
  ordersAwaitingDispatch: number;
  delays: number;
}): LogisticsKPI[] {
  return [
    {
      id: 'kpi-week',
      label: "This week's schedule",
      value: opts.weekScheduled.toString(),
      subtitle:
        opts.weekScheduled > 0
          ? 'Trips in the next 7 days'
          : 'Nothing scheduled this week',
      status: 'neutral',
      href: '/logistics?tab=dispatch',
    },
    {
      id: 'kpi-orders',
      label: 'Orders to dispatch',
      value: opts.ordersAwaitingDispatch.toString(),
      subtitle: 'Approved orders not on a trip',
      status: opts.ordersAwaitingDispatch > 0 ? 'warning' : 'good',
      href: '/logistics?tab=dispatch',
    },
    {
      id: 'kpi-delays',
      label: 'Open delays',
      value: opts.delays.toString(),
      subtitle: opts.delays > 0 ? 'Delay / failure investigations' : 'No open exceptions',
      status: opts.delays > 0 ? 'danger' : 'good',
      href: '/logistics?tab=dispatch',
    },
  ];
}

/** Trips overlapping a calendar month (includes multi-day voyages). */
export async function fetchCalendarTrips(
  branchId: string,
  year: number,
  month: number,
): Promise<LogisticsTripRow[]> {
  try {
    const monthStart = isoDate(new Date(year, month, 1));
    const monthEnd = isoDate(new Date(year, month + 1, 0));

    const { data, error } = await supabase
      .from('trips')
      .select(TRIP_SELECT_BASE)
      .eq('branch_id', branchId)
      .lte('scheduled_date', monthEnd)
      .not('status', 'eq', 'Failed')
      .order('scheduled_date', { ascending: true })
      .order('departure_time', { ascending: true })
      .limit(500);

    if (error) throw error;

    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) =>
        tripOverlapsWeek(toStr(row.scheduled_date), toStr(row.eta), monthStart, monthEnd),
      )
      .map(mapTripRow);
  } catch (e) {
    logDev('calendar trips', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchLogisticsDashboard(opts: {
  branchName: string | null;
}): Promise<LogisticsDashboardBundle> {
  const branchTrim = opts.branchName?.trim() || '';
  const branchName = branchTrim === '' ? null : branchTrim;
  const branchId = branchName ? await resolveBranchIdByName(branchName) : null;

  const [weekSchedule, ordersAwaitingDispatch, allDelays] = await Promise.all([
    fetchWeekSchedule(branchId),
    fetchOrdersAwaitingDispatch(branchId),
    fetchOpenDelayExceptions(branchId),
  ]);

  const kpis = buildKpis({
    weekScheduled: weekSchedule.length,
    ordersAwaitingDispatch: ordersAwaitingDispatch.length,
    delays: allDelays.length,
  });

  return {
    branchId,
    branchName,
    generatedAt: new Date().toISOString(),
    kpis,

    weekSchedule,
    weekScheduleCount: weekSchedule.length,

    ordersAwaitingDispatch,
    ordersAwaitingDispatchCount: ordersAwaitingDispatch.length,

    delays: allDelays.slice(0, 10),
    delayCount: allDelays.length,
  };
}

/** Pretty-print used by the page UI for cost figures. */
export function formatLogisticsPeso(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '₱0';
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `₱${(amount / 1_000).toFixed(0)}K`;
  return `₱${Math.round(amount).toLocaleString()}`;
}
