/**
 * Inter-island shipping containers — stored in `vehicles` with type `Shipping Container`.
 * Mirrors truck fleet CRUD (dimensions + capacity) but no driver-related fields in scheduling.
 */
import { supabase } from '@/src/lib/supabase';
import { resolveBranchIdByName } from '@/src/lib/branchCompanySettings';
import type { Vehicle } from '@/src/types/logistics';
import {
  vehicleRowToTruckForm,
  type TruckFormPayload,
} from '@/src/lib/fleetTrucks';

export type ContainerFormPayload = TruckFormPayload;

export function emptyContainerForm(): ContainerFormPayload {
  return {
    ...vehicleRowToTruckForm({
      id: '',
      vehicle_id: '',
      vehicle_name: '',
      plate_number: null,
      type: 'Shipping Container',
      status: 'Available',
      current_trip_id: null,
      trips_today: 0,
      next_available_time: null,
      utilization_percent: 0,
      max_weight_kg: 0,
      max_volume_cbm: 0,
      maintenance_due: null,
      alerts: null,
      make: null,
      model: null,
      year_model: null,
      color: null,
      orcr_number: null,
      registration_expiry: null,
      current_odometer_km: 0,
      created_at: new Date().toISOString(),
      branches: null,
    }),
    vehicleId: '',
    vehicleName: '',
    plateNumber: '',
    make: '',
    model: '',
    engine: '',
    orcrNumber: '',
    currentOdometerKm: '',
  };
}

function num(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = typeof n === 'number' ? n : parseFloat(String(n));
  return Number.isFinite(x) ? x : fallback;
}

function int(n: unknown, fallback = 0): number {
  return Math.round(num(n, fallback));
}

type ContainerRow = {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  plate_number: string | null;
  type: string;
  status: Vehicle['status'];
  current_trip_id: string | null;
  trips_today: number | null;
  next_available_time: string | null;
  utilization_percent: number | string | null;
  max_weight_kg: number | string | null;
  max_volume_cbm: number | string | null;
  maintenance_due: string | null;
  alerts: string[] | null;
  vehicle_length_m?: number | string | null;
  vehicle_width_m?: number | string | null;
  vehicle_height_m?: number | string | null;
  branches?: { name: string } | null;
};

function mapRowToContainer(row: ContainerRow, tripNumberById: Map<string, string>): Vehicle {
  const tripNo = row.current_trip_id ? tripNumberById.get(row.current_trip_id) : undefined;
  const mw = num(row.max_weight_kg);
  const mv = num(row.max_volume_cbm);
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    plateNumber: row.plate_number ?? undefined,
    type: 'Shipping Container',
    status: row.status,
    currentTrip: tripNo,
    tripsToday: int(row.trips_today),
    nextAvailableTime: row.next_available_time
      ? new Date(row.next_available_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : undefined,
    utilizationPercent: Math.round(num(row.utilization_percent)),
    maxWeight: mw,
    maxVolume: mv,
    maxCapacityKg: mw,
    maxCapacityCbm: mv,
    maintenanceDue: row.maintenance_due?.slice(0, 10),
    alerts: row.alerts ?? undefined,
    branch: row.branches?.name,
  };
}

async function loadTripNumbers(rows: ContainerRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.current_trip_id).filter(Boolean))] as string[];
  if (!ids.length) return new Map();
  const { data } = await supabase.from('trips').select('id, trip_number').in('id', ids);
  return new Map((data ?? []).map((t) => [t.id as string, t.trip_number as string]));
}

export async function fetchFleetContainersForBranch(branchName: string): Promise<{
  vehicles: Vehicle[];
  error?: string;
}> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return { vehicles: [], error: 'Could not resolve branch for container fleet.' };

  const { data, error } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('branch_id', bid)
    .eq('type', 'Shipping Container')
    .order('vehicle_id', { ascending: true });

  if (error) return { vehicles: [], error: error.message };

  const rows = (data ?? []) as ContainerRow[];
  const tripMap = await loadTripNumbers(rows);
  return { vehicles: rows.map((r) => mapRowToContainer(r, tripMap)) };
}

/** True when the branch has at least one shipping container in fleet (Ship delivery type). */
export async function branchHasShippingContainers(branchName: string): Promise<boolean> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return false;

  const { count, error } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', bid)
    .eq('type', 'Shipping Container');

  if (error) {
    if (import.meta.env.DEV) console.warn('[fleet] container count failed:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function fetchContainerFormById(
  vehicleUuid: string,
): Promise<{ form: ContainerFormPayload | null; error?: string }> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, branches ( name )')
    .eq('id', vehicleUuid)
    .eq('type', 'Shipping Container')
    .maybeSingle();
  if (error) return { form: null, error: error.message };
  if (!data) return { form: null, error: 'Container not found.' };
  return { form: vehicleRowToTruckForm(data as Parameters<typeof vehicleRowToTruckForm>[0]) };
}

type ContainerFormNumericFields = {
  maxWeightKg: number;
  maxVolumeCbm: number;
  lengthM: number | null;
  widthM: number | null;
  heightM: number | null;
};

function parseFormNumbers(
  form: ContainerFormPayload,
): { ok: true; nums: ContainerFormNumericFields } | { ok: false; error: string } {
  const parse = (label: string, raw: string) => {
    const t = raw.trim();
    if (t === '') return { ok: true as const, value: 0 };
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return { ok: false as const, error: `${label} must be empty or a non-negative number.` };
    return { ok: true as const, value: n };
  };
  const parseNull = (label: string, raw: string) => {
    const t = raw.trim();
    if (t === '') return { ok: true as const, value: null as number | null };
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return { ok: false as const, error: `${label} must be empty or a non-negative number.` };
    return { ok: true as const, value: n };
  };

  const maxWeightKg = parse('Max weight (kg)', form.maxWeightKg);
  if (!maxWeightKg.ok) return maxWeightKg as { ok: false; error: string };
  const maxVolumeCbm = parse('Max volume (m³)', form.maxVolumeCbm);
  if (!maxVolumeCbm.ok) return maxVolumeCbm as { ok: false; error: string };
  const lengthM = parseNull('Length (m)', form.lengthM);
  if (!lengthM.ok) return lengthM as { ok: false; error: string };
  const widthM = parseNull('Width (m)', form.widthM);
  if (!widthM.ok) return widthM as { ok: false; error: string };
  const heightM = parseNull('Height (m)', form.heightM);
  if (!heightM.ok) return heightM as { ok: false; error: string };

  return {
    ok: true as const,
    nums: {
      maxWeightKg: maxWeightKg.value,
      maxVolumeCbm: maxVolumeCbm.value,
      lengthM: lengthM.value,
      widthM: widthM.value,
      heightM: heightM.value,
    },
  };
}

function formToDbRow(form: ContainerFormPayload, branchId: string) {
  const notes = form.notesText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    vehicle_id: form.vehicleId.trim().toUpperCase(),
    vehicle_name: form.vehicleName.trim(),
    plate_number: form.plateNumber.trim() || null,
    type: 'Shipping Container',
    maintenance_due: form.maintenanceDue.trim() || null,
    alerts: notes.length ? notes : null,
    make: form.make.trim() || null,
    model: form.model.trim() || null,
    branch_id: branchId,
    updated_at: new Date().toISOString(),
  };
}

export async function createContainer(
  branchName: string,
  form: ContainerFormPayload,
): Promise<{ ok: boolean; error?: string }> {
  const bname = form.branchName.trim() || branchName.trim();
  const bid = await resolveBranchIdByName(bname);
  if (!bid) return { ok: false, error: 'Could not find branch.' };
  if (!form.vehicleId.trim() || !form.vehicleName.trim()) {
    return { ok: false, error: 'Container code and name are required.' };
  }

  const parsed = parseFormNumbers(form);
  if (parsed.ok === false) return { ok: false, error: parsed.error };

  const row = {
    ...formToDbRow(form, bid),
    max_weight_kg: parsed.nums.maxWeightKg,
    max_volume_cbm: parsed.nums.maxVolumeCbm,
    vehicle_length_m: parsed.nums.lengthM,
    vehicle_width_m: parsed.nums.widthM,
    vehicle_height_m: parsed.nums.heightM,
    status: 'Available',
    financing_status: 'Owned',
    utilization_percent: 0,
    trips_today: 0,
  };

  const { error } = await supabase.from('vehicles').insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateContainer(
  vehicleUuid: string,
  form: ContainerFormPayload,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseFormNumbers(form);
  if (parsed.ok === false) return { ok: false, error: parsed.error };

  const bid = await resolveBranchIdByName(form.branchName.trim());
  if (!bid) return { ok: false, error: 'Could not find branch.' };

  const row = {
    ...formToDbRow(form, bid),
    max_weight_kg: parsed.nums.maxWeightKg,
    max_volume_cbm: parsed.nums.maxVolumeCbm,
    vehicle_length_m: parsed.nums.lengthM,
    vehicle_width_m: parsed.nums.widthM,
    vehicle_height_m: parsed.nums.heightM,
    status: form.status,
  };

  const { error } = await supabase
    .from('vehicles')
    .update(row)
    .eq('id', vehicleUuid)
    .eq('type', 'Shipping Container');
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
