import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_ORDER_PERMISSIONS_GRANTED,
  ORDER_PERMISSIONS,
  type OrderPermissionKey,
  type OrderPermissionSet,
} from './orderPermissions';

const PERMISSION_KEYS = ORDER_PERMISSIONS.map((p) => p.key);

/** Merge stored JSON with defaults — missing keys stay granted for backward compatibility. */
export function normalizeOrderPermissionSet(raw: unknown): OrderPermissionSet {
  const base = { ...ALL_ORDER_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function orderPermissionSetsEqual(a: OrderPermissionSet, b: OrderPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeOrderPermissionSet(permissions: OrderPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeOrderPermissions(employeeId: string): Promise<OrderPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_order_permissions',
    normalizeOrderPermissionSet,
    { ...ALL_ORDER_PERMISSIONS_GRANTED },
    (merged) => merged.orders,
  );
}

export async function saveEmployeeOrderPermissions(
  employeeId: string,
  permissions: OrderPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_order_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeOrderPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleOrderPermission(
  current: OrderPermissionSet,
  key: OrderPermissionKey,
): OrderPermissionSet {
  return { ...current, [key]: !current[key] };
}
