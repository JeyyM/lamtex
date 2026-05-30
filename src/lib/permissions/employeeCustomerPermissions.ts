import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_CUSTOMER_PERMISSIONS_DENIED,
  ALL_CUSTOMER_PERMISSIONS_GRANTED,
  CUSTOMER_PERMISSIONS,
  type CustomerPermissionKey,
  type CustomerPermissionSet,
} from './customerPermissions';

const PERMISSION_KEYS = CUSTOMER_PERMISSIONS.map((p) => p.key);

export function normalizeCustomerPermissionSet(raw: unknown): CustomerPermissionSet {
  const base = { ...ALL_CUSTOMER_PERMISSIONS_DENIED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function customerPermissionSetsEqual(a: CustomerPermissionSet, b: CustomerPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeCustomerPermissionSet(permissions: CustomerPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeCustomerPermissions(employeeId: string): Promise<CustomerPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_customer_permissions',
    normalizeCustomerPermissionSet,
    { ...ALL_CUSTOMER_PERMISSIONS_DENIED },
    (merged) => merged.customers,
  );
}

export async function saveEmployeeCustomerPermissions(
  employeeId: string,
  permissions: CustomerPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_customer_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeCustomerPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleCustomerPermission(
  current: CustomerPermissionSet,
  key: CustomerPermissionKey,
): CustomerPermissionSet {
  return { ...current, [key]: !current[key] };
}
