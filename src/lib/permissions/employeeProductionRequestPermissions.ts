import { supabase } from '@/src/lib/supabase';
import {
  ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED,
  PRODUCTION_REQUEST_PERMISSIONS,
  type ProductionRequestPermissionKey,
  type ProductionRequestPermissionSet,
} from './productionRequestPermissions';

const PERMISSION_KEYS = PRODUCTION_REQUEST_PERMISSIONS.map((p) => p.key);

export function normalizeProductionRequestPermissionSet(raw: unknown): ProductionRequestPermissionSet {
  const base = { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function productionRequestPermissionSetsEqual(
  a: ProductionRequestPermissionSet,
  b: ProductionRequestPermissionSet,
): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeProductionRequestPermissionSet(
  permissions: ProductionRequestPermissionSet,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeProductionRequestPermissions(
  employeeId: string,
): Promise<ProductionRequestPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_production_request_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeProductionRequestPermissions] fetch', error.message);
    return { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
  return normalizeProductionRequestPermissionSet(data.permissions);
}

export async function saveEmployeeProductionRequestPermissions(
  employeeId: string,
  permissions: ProductionRequestPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_production_request_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeProductionRequestPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleProductionRequestPermission(
  current: ProductionRequestPermissionSet,
  key: ProductionRequestPermissionKey,
): ProductionRequestPermissionSet {
  return { ...current, [key]: !current[key] };
}
