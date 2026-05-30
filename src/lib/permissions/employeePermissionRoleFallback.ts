import { supabase } from '@/src/lib/supabase';
import type { UserRole } from '@/src/types';
import { resolveEmployeeDashboardRoles } from './employeeUserRoles';
import {
  mergeDefaultPermissionsForRoles,
  rolesHaveDefaultTemplates,
  type MergedRoleDefaultPermissions,
} from './roleDefaultPermissions';

const mergedDefaultsCache = new Map<string, MergedRoleDefaultPermissions | null>();

export function clearEmployeePermissionRoleFallbackCache(employeeId?: string): void {
  if (employeeId) mergedDefaultsCache.delete(employeeId.trim());
  else mergedDefaultsCache.clear();
}

async function loadMergedRoleDefaults(employeeId: string): Promise<MergedRoleDefaultPermissions | null> {
  const id = employeeId.trim();
  if (!id) return null;
  if (mergedDefaultsCache.has(id)) return mergedDefaultsCache.get(id)!;

  const { data: emp, error } = await supabase
    .from('employees')
    .select('user_role, role')
    .eq('id', id)
    .maybeSingle();

  if (error && import.meta.env.DEV) {
    console.warn('[permission role fallback] employee lookup', error.message);
  }

  const { roles } = await resolveEmployeeDashboardRoles(
    id,
    (emp?.user_role as UserRole | null) ?? null,
    emp?.role ?? null,
  );

  const merged = rolesHaveDefaultTemplates(roles) ? mergeDefaultPermissionsForRoles(roles) : null;
  mergedDefaultsCache.set(id, merged);
  return merged;
}

async function fetchStoredEmployeePermissions(
  table: string,
  employeeId: string,
): Promise<unknown | null> {
  const id = employeeId.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from(table)
    .select('permissions')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data.permissions ?? null;
}

/** Stored row wins; otherwise role templates; otherwise full access. */
export async function resolveEmployeePermissionsWithRoleFallback<T extends Record<string, boolean>>(
  employeeId: string,
  table: string,
  normalize: (raw: unknown) => T,
  allGranted: T,
  pickModule: (merged: MergedRoleDefaultPermissions) => T,
): Promise<T> {
  const id = employeeId.trim();
  if (!id) return { ...allGranted };

  try {
    const stored = await fetchStoredEmployeePermissions(table, id);
    if (stored !== null) return normalize(stored);

    const merged = await loadMergedRoleDefaults(id);
    if (merged) return pickModule(merged);

    return { ...allGranted };
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[${table}] fetch`, e);
    return { ...allGranted };
  }
}
