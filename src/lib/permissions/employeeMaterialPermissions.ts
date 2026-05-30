import { supabase } from '@/src/lib/supabase';
import {
  ALL_MATERIAL_PERMISSIONS_GRANTED,
  MATERIAL_PERMISSIONS,
  type MaterialPermissionKey,
  type MaterialPermissionSet,
} from './materialPermissions';

const PERMISSION_KEYS = MATERIAL_PERMISSIONS.map((p) => p.key);

export function normalizeMaterialPermissionSet(raw: unknown): MaterialPermissionSet {
  const base = { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function materialPermissionSetsEqual(a: MaterialPermissionSet, b: MaterialPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeMaterialPermissionSet(permissions: MaterialPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeMaterialPermissions(employeeId: string): Promise<MaterialPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_MATERIAL_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_material_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeMaterialPermissions] fetch', error.message);
    return { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
  return normalizeMaterialPermissionSet(data.permissions);
}

export async function saveEmployeeMaterialPermissions(
  employeeId: string,
  permissions: MaterialPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_material_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeMaterialPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleMaterialPermission(
  current: MaterialPermissionSet,
  key: MaterialPermissionKey,
): MaterialPermissionSet {
  return { ...current, [key]: !current[key] };
}
