import { supabase } from '@/src/lib/supabase';
import { resolveEmployeePermissionsWithRoleFallback } from './employeePermissionRoleFallback';
import {
  ALL_SETTINGS_PERMISSIONS_GRANTED,
  SETTINGS_PERMISSIONS,
  type SettingsPermissionKey,
  type SettingsPermissionSet,
} from './settingsPermissions';

const PERMISSION_KEYS = SETTINGS_PERMISSIONS.map((p) => p.key);

export function normalizeSettingsPermissionSet(raw: unknown): SettingsPermissionSet {
  const base = { ...ALL_SETTINGS_PERMISSIONS_GRANTED };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof obj[key] === 'boolean') base[key] = obj[key];
  }
  return base;
}

export function settingsPermissionSetsEqual(a: SettingsPermissionSet, b: SettingsPermissionSet): boolean {
  return PERMISSION_KEYS.every((k) => a[k] === b[k]);
}

export function serializeSettingsPermissionSet(permissions: SettingsPermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) out[key] = permissions[key];
  return out;
}

export async function fetchEmployeeSettingsPermissions(employeeId: string): Promise<SettingsPermissionSet> {
  return resolveEmployeePermissionsWithRoleFallback(
    employeeId,
    'employee_settings_permissions',
    normalizeSettingsPermissionSet,
    { ...ALL_SETTINGS_PERMISSIONS_GRANTED },
    (merged) => merged.settings,
  );
}

export async function saveEmployeeSettingsPermissions(
  employeeId: string,
  permissions: SettingsPermissionSet,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const { error } = await supabase.from('employee_settings_permissions').upsert(
    {
      employee_id: id,
      permissions: serializeSettingsPermissionSet(permissions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
}

export function toggleSettingsPermission(
  current: SettingsPermissionSet,
  key: SettingsPermissionKey,
): SettingsPermissionSet {
  return { ...current, [key]: !current[key] };
}
