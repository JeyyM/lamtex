/** Employees directory module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type EmployeesPermissionKey = 'pageAccess';

export interface EmployeesPermissionDef {
  key: EmployeesPermissionKey;
  label: string;
  description: string;
}

export const EMPLOYEES_PERMISSIONS: readonly EmployeesPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Employees directory, employee detail pages, and add-employee flow.',
  },
] as const;

export type EmployeesPermissionSet = Record<EmployeesPermissionKey, boolean>;

export const ALL_EMPLOYEES_PERMISSIONS_GRANTED: EmployeesPermissionSet = EMPLOYEES_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as EmployeesPermissionSet,
);

export function useEmployeesPermissions(): EmployeesPermissionSet {
  const { isExecutiveUser, employeesPermissions } = useAppContext();
  return useMemo<EmployeesPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
    if (employeesPermissions) return employeesPermissions;
    return { ...ALL_EMPLOYEES_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, employeesPermissions]);
}
