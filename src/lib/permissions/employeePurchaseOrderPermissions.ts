import { supabase } from '@/src/lib/supabase';
import {
  ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED,
  PURCHASE_ORDER_PERMISSIONS,
  type PurchaseOrderPermissionKey,
  type PurchaseOrderPermissionSet,
} from './purchaseOrderPermissions';

const PERMISSION_KEYS = PURCHASE_ORDER_PERMISSIONS.map((p) => p.key);

export function normalizePurchaseOrderPermissionSet(raw: unknown): PurchaseOrderPermissionSet {
  const base = { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function purchaseOrderPermissionSetsEqual(
  a: PurchaseOrderPermissionSet,
  b: PurchaseOrderPermissionSet,
): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializePurchaseOrderPermissionSet(
  permissions: PurchaseOrderPermissionSet,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeePurchaseOrderPermissions(
  employeeId: string,
): Promise<PurchaseOrderPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_purchase_order_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeePurchaseOrderPermissions] fetch', error.message);
    return { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
  return normalizePurchaseOrderPermissionSet(data.permissions);
}

export async function saveEmployeePurchaseOrderPermissions(
  employeeId: string,
  permissions: PurchaseOrderPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_purchase_order_permissions').upsert(
    {
      employee_id: id,
      permissions: serializePurchaseOrderPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function togglePurchaseOrderPermission(
  current: PurchaseOrderPermissionSet,
  key: PurchaseOrderPermissionKey,
): PurchaseOrderPermissionSet {
  return { ...current, [key]: !current[key] };
}
