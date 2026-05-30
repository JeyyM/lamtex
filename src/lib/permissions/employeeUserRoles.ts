import { supabase } from '@/src/lib/supabase';
import type { UserRole } from '@/src/types';

export type EmployeeUserRoleRow = {
  userRole: UserRole;
  isPrimary: boolean;
};

function ts() {
  return new Date().toISOString();
}

export async function fetchEmployeeUserRoles(employeeId: string): Promise<EmployeeUserRoleRow[]> {
  const id = employeeId.trim();
  if (!id) return [];

  const { data, error } = await supabase
    .from('employee_user_roles')
    .select('user_role, is_primary')
    .eq('employee_id', id)
    .order('is_primary', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.warn('[employeeUserRoles] fetch', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    userRole: row.user_role as UserRole,
    isPrimary: Boolean(row.is_primary),
  }));
}

export async function saveEmployeeUserRoles(
  employeeId: string,
  roles: UserRole[],
  primaryRole: UserRole,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');
  if (roles.length === 0) throw new Error('At least one dashboard role is required.');
  if (!roles.includes(primaryRole)) throw new Error('Primary role must be one of the assigned roles.');

  const { error: delErr } = await supabase.from('employee_user_roles').delete().eq('employee_id', id);
  if (delErr) throw delErr;

  const rows = roles.map((user_role) => ({
    employee_id: id,
    user_role,
    is_primary: user_role === primaryRole,
  }));

  const { error: insErr } = await supabase.from('employee_user_roles').insert(rows);
  if (insErr) throw insErr;

  const { error: updErr } = await supabase
    .from('employees')
    .update({ user_role: primaryRole, updated_at: ts() })
    .eq('id', id);
  if (updErr) throw updErr;
}

/** Map HR directory role to dashboard role when user_role / junction rows are missing. */
export function dashboardRoleFromDirectoryRole(
  directoryRole: string | null | undefined,
): UserRole | null {
  switch (directoryRole) {
    case 'Warehouse Manager':
      return 'Warehouse';
    case 'Logistics Manager':
      return 'Logistics';
    case 'Truck Driver':
      return 'Driver';
    case 'Sales Agent':
      return 'Agent';
    default:
      return null;
  }
}

/** Load assigned roles; fall back to legacy employees.user_role when junction is empty. */
export async function resolveEmployeeDashboardRoles(
  employeeId: string,
  legacyUserRole: UserRole | null | undefined,
  directoryRole?: string | null,
): Promise<{ roles: UserRole[]; primaryRole: UserRole | null }> {
  const rows = await fetchEmployeeUserRoles(employeeId);
  if (rows.length > 0) {
    const roles = rows.map((r) => r.userRole);
    const primary = rows.find((r) => r.isPrimary)?.userRole ?? roles[0] ?? null;
    return { roles, primaryRole: primary };
  }
  if (legacyUserRole) {
    return { roles: [legacyUserRole], primaryRole: legacyUserRole };
  }
  const fromDirectory = dashboardRoleFromDirectoryRole(directoryRole);
  if (fromDirectory) {
    return { roles: [fromDirectory], primaryRole: fromDirectory };
  }
  return { roles: [], primaryRole: null };
}
