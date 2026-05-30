import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_FINANCE_PERMISSIONS_GRANTED,
  FINANCE_PERMISSIONS,
  type FinancePermissionKey,
  type FinancePermissionSet,
} from './financePermissions';

const PERMISSION_KEYS = FINANCE_PERMISSIONS.map((p) => p.key);

export function normalizeFinancePermissionSet(raw: unknown): FinancePermissionSet {
  const base = { ...ALL_FINANCE_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function financePermissionSetsEqual(a: FinancePermissionSet, b: FinancePermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeFinancePermissionSet(permissions: FinancePermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeFinancePermissions(employeeId: string): Promise<FinancePermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_finance_permissions',
    normalizeFinancePermissionSet,
    { ...ALL_FINANCE_PERMISSIONS_GRANTED },
    (merged) => merged.finance,
  );
}

export async function saveEmployeeFinancePermissions(
  employeeId: string,
  permissions: FinancePermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_finance_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeFinancePermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleFinancePermission(
  current: FinancePermissionSet,
  key: FinancePermissionKey,
): FinancePermissionSet {
  return { ...current, [key]: !current[key] };
}
