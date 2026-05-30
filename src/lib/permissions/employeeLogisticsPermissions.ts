import { supabase } from '@/src/lib/supabase';
import {
  ALL_LOGISTICS_PERMISSIONS_GRANTED,
  LOGISTICS_PERMISSIONS,
  type LogisticsPermissionKey,
  type LogisticsPermissionSet,
} from './logisticsPermissions';

const PERMISSION_KEYS = LOGISTICS_PERMISSIONS.map((p) => p.key);

export function normalizeLogisticsPermissionSet(raw: unknown): LogisticsPermissionSet {
  const base = { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function logisticsPermissionSetsEqual(a: LogisticsPermissionSet, b: LogisticsPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeLogisticsPermissionSet(permissions: LogisticsPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeLogisticsPermissions(employeeId: string): Promise<LogisticsPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_logistics_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeLogisticsPermissions] fetch', error.message);
    return { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
  return normalizeLogisticsPermissionSet(data.permissions);
}

export async function saveEmployeeLogisticsPermissions(
  employeeId: string,
  permissions: LogisticsPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_logistics_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeLogisticsPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleLogisticsPermission(
  current: LogisticsPermissionSet,
  key: LogisticsPermissionKey,
): LogisticsPermissionSet {
  return { ...current, [key]: !current[key] };
}
