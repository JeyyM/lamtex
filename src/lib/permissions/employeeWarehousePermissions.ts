import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_WAREHOUSE_PERMISSIONS_GRANTED,
  WAREHOUSE_PERMISSIONS,
  type WarehousePermissionKey,
  type WarehousePermissionSet,
} from './warehousePermissions';

const PERMISSION_KEYS = WAREHOUSE_PERMISSIONS.map((p) => p.key);

export function normalizeWarehousePermissionSet(raw: unknown): WarehousePermissionSet {
  const base = { ...ALL_WAREHOUSE_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function warehousePermissionSetsEqual(a: WarehousePermissionSet, b: WarehousePermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeWarehousePermissionSet(permissions: WarehousePermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeWarehousePermissions(employeeId: string): Promise<WarehousePermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_warehouse_permissions',
    normalizeWarehousePermissionSet,
    { ...ALL_WAREHOUSE_PERMISSIONS_GRANTED },
    (merged) => merged.warehouse,
  );
}

export async function saveEmployeeWarehousePermissions(
  employeeId: string,
  permissions: WarehousePermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_warehouse_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeWarehousePermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleWarehousePermission(
  current: WarehousePermissionSet,
  key: WarehousePermissionKey,
): WarehousePermissionSet {
  return { ...current, [key]: !current[key] };
}
