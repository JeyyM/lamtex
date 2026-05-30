import { supabase } from '@/src/lib/supabase';
import {
  ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED,
  INTER_BRANCH_REQUEST_PERMISSIONS,
  type InterBranchRequestPermissionKey,
  type InterBranchRequestPermissionSet,
} from './interBranchRequestPermissions';

const PERMISSION_KEYS = INTER_BRANCH_REQUEST_PERMISSIONS.map((p) => p.key);

export function normalizeInterBranchRequestPermissionSet(raw: unknown): InterBranchRequestPermissionSet {
  const base = { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function interBranchRequestPermissionSetsEqual(
  a: InterBranchRequestPermissionSet,
  b: InterBranchRequestPermissionSet,
): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeInterBranchRequestPermissionSet(
  permissions: InterBranchRequestPermissionSet,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeInterBranchRequestPermissions(
  employeeId: string,
): Promise<InterBranchRequestPermissionSet> {
  const id = employeeId.trim();
  if (!id) return { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };

  const { data, error } = await supabase
    .from('employee_inter_branch_request_permissions')
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeInterBranchRequestPermissions] fetch', error.message);
    return { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
  }
  if (!data?.permissions) return { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
  return normalizeInterBranchRequestPermissionSet(data.permissions);
}

export async function saveEmployeeInterBranchRequestPermissions(
  employeeId: string,
  permissions: InterBranchRequestPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_inter_branch_request_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeInterBranchRequestPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleInterBranchRequestPermission(
  current: InterBranchRequestPermissionSet,
  key: InterBranchRequestPermissionKey,
): InterBranchRequestPermissionSet {
  return { ...current, [key]: !current[key] };
}
