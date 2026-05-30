import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_REPORTS_PERMISSIONS_GRANTED,
  REPORTS_PERMISSIONS,
  type ReportsPermissionKey,
  type ReportsPermissionSet,
} from './reportsPermissions';

const PERMISSION_KEYS = REPORTS_PERMISSIONS.map((p) => p.key);

export function normalizeReportsPermissionSet(raw: unknown): ReportsPermissionSet {
  const base = { ...ALL_REPORTS_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function reportsPermissionSetsEqual(a: ReportsPermissionSet, b: ReportsPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeReportsPermissionSet(permissions: ReportsPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeReportsPermissions(employeeId: string): Promise<ReportsPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_reports_permissions',
    normalizeReportsPermissionSet,
    { ...ALL_REPORTS_PERMISSIONS_GRANTED },
    (merged) => merged.reports,
  );
}

export async function saveEmployeeReportsPermissions(
  employeeId: string,
  permissions: ReportsPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_reports_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeReportsPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleReportsPermission(
  current: ReportsPermissionSet,
  key: ReportsPermissionKey,
): ReportsPermissionSet {
  return { ...current, [key]: !current[key] };
}
