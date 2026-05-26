import type { UserRole } from '@/src/types';

/** Job title on `employees.role` (employee_role enum). */
export type EmployeeJobRole =
  | 'Sales Agent'
  | 'Logistics Manager'
  | 'Warehouse Manager'
  | 'Machine Worker'
  | 'Truck Driver';

const JOB_TO_DASHBOARD: Record<EmployeeJobRole, UserRole> = {
  'Sales Agent': 'Agent',
  'Logistics Manager': 'Logistics',
  'Warehouse Manager': 'Warehouse',
  'Machine Worker': 'Warehouse',
  'Truck Driver': 'Driver',
};

/** Prefer explicit `user_role`; fall back to job title for legacy rows. */
export function resolveDashboardRole(
  userRole: UserRole | null | undefined,
  jobRole: string | null | undefined,
): UserRole | null {
  if (userRole) return userRole;
  if (!jobRole) return null;
  return JOB_TO_DASHBOARD[jobRole as EmployeeJobRole] ?? null;
}

export function isExecutiveDashboardRole(role: UserRole | null | undefined): boolean {
  return role === 'Executive';
}
