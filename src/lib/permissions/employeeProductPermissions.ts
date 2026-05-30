import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_PRODUCT_PERMISSIONS_GRANTED,
  PRODUCT_PERMISSIONS,
  type ProductPermissionKey,
  type ProductPermissionSet,
} from './productPermissions';

const PERMISSION_KEYS = PRODUCT_PERMISSIONS.map((p) => p.key);

export function normalizeProductPermissionSet(raw: unknown): ProductPermissionSet {
  const base = { ...ALL_PRODUCT_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function productPermissionSetsEqual(a: ProductPermissionSet, b: ProductPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeProductPermissionSet(permissions: ProductPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeProductPermissions(employeeId: string): Promise<ProductPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_product_permissions',
    normalizeProductPermissionSet,
    { ...ALL_PRODUCT_PERMISSIONS_GRANTED },
    (merged) => merged.products,
  );
}

export async function saveEmployeeProductPermissions(
  employeeId: string,
  permissions: ProductPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_product_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeProductPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleProductPermission(
  current: ProductPermissionSet,
  key: ProductPermissionKey,
): ProductPermissionSet {
  return { ...current, [key]: !current[key] };
}
