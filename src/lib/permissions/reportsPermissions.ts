/** Reports module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type ReportsPermissionKey = 'pageAccess';

export interface ReportsPermissionDef {
  key: ReportsPermissionKey;
  label: string;
  description: string;
}

export const REPORTS_PERMISSIONS: readonly ReportsPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Reports page (overview, sales, products, inventory, agents tabs and exports).',
  },
] as const;

export type ReportsPermissionSet = Record<ReportsPermissionKey, boolean>;

export const ALL_REPORTS_PERMISSIONS_GRANTED: ReportsPermissionSet = REPORTS_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as ReportsPermissionSet,
);

export function useReportsPermissions(): ReportsPermissionSet {
  const { isExecutiveUser, reportsPermissions } = useAppContext();
  return useMemo<ReportsPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_REPORTS_PERMISSIONS_GRANTED };
    if (reportsPermissions) return reportsPermissions;
    return { ...ALL_REPORTS_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, reportsPermissions]);
}
