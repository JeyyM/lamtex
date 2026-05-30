import { supabase } from '@/src/lib/supabase';
import {
  ALL_EMPLOYEES_PERMISSIONS_GRANTED,
  EMPLOYEES_PERMISSIONS,
  type EmployeesPermissionKey,
  type EmployeesPermissionSet,
} from './employeesPermissions';

const PERMISSION_KEYS = EMPLOYEES_PERMISSIONS.map((p) => p.key);

export function normalizeEmployeesPermissionSet(raw: unknown): EmployeesPermissionSet {
  const base = { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function employeesPermissionSetsEqual(a: EmployeesPermissionSet, b: EmployeesPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeEmployeesPermissionSet(permissions: EmployeesPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeEmployeesPermissions(employeeId: string): Promise<EmployeesPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_employees_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeEmployeesPermissions] fetch', error.message);
    return { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
  return normalizeEmployeesPermissionSet(data.permissions);
}

export async function saveEmployeeEmployeesPermissions(
  employeeId: string,
  permissions: EmployeesPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_employees_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeEmployeesPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleEmployeesPermission(
  current: EmployeesPermissionSet,
  key: EmployeesPermissionKey,
): EmployeesPermissionSet {
  return { ...current, [key]: !current[key] };
}
