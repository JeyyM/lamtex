import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_SUPPLIER_PERMISSIONS_GRANTED,
  SUPPLIER_PERMISSIONS,
  type SupplierPermissionKey,
  type SupplierPermissionSet,
} from './supplierPermissions';

const PERMISSION_KEYS = SUPPLIER_PERMISSIONS.map((p) => p.key);

export function normalizeSupplierPermissionSet(raw: unknown): SupplierPermissionSet {
  const base = { ...ALL_SUPPLIER_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function supplierPermissionSetsEqual(a: SupplierPermissionSet, b: SupplierPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeSupplierPermissionSet(permissions: SupplierPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeSupplierPermissions(employeeId: string): Promise<SupplierPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_supplier_permissions',
    normalizeSupplierPermissionSet,
    { ...ALL_SUPPLIER_PERMISSIONS_GRANTED },
    (merged) => merged.suppliers,
  );
}

export async function saveEmployeeSupplierPermissions(
  employeeId: string,
  permissions: SupplierPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_supplier_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeSupplierPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleSupplierPermission(
  current: SupplierPermissionSet,
  key: SupplierPermissionKey,
): SupplierPermissionSet {
  return { ...current, [key]: !current[key] };
}
