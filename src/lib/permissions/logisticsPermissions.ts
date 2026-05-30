/** Logistics module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type LogisticsPermissionKey = 'pageAccess';

export interface LogisticsPermissionDef {
  key: LogisticsPermissionKey;
  label: string;
  description: string;
}

export const LOGISTICS_PERMISSIONS: readonly LogisticsPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Logistics page (dispatch, routes, fleet) and truck detail views.',
  },
] as const;

export type LogisticsPermissionSet = Record<LogisticsPermissionKey, boolean>;

export const ALL_LOGISTICS_PERMISSIONS_GRANTED: LogisticsPermissionSet = LOGISTICS_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as LogisticsPermissionSet,
);

export function useLogisticsPermissions(): LogisticsPermissionSet {
  const { isExecutiveUser, logisticsPermissions } = useAppContext();
  return useMemo<LogisticsPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
    if (logisticsPermissions) return logisticsPermissions;
    return { ...ALL_LOGISTICS_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, logisticsPermissions]);
}
