/** Warehouse hub permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type WarehousePermissionKey = 'pageAccess';

export interface WarehousePermissionDef {
  key: WarehousePermissionKey;
  label: string;
  description: string;
}

export const WAREHOUSE_PERMISSIONS: readonly WarehousePermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Warehouse hub page (inventory, schedule, loading, movements).',
  },
] as const;

export type WarehousePermissionSet = Record<WarehousePermissionKey, boolean>;

export const ALL_WAREHOUSE_PERMISSIONS_GRANTED: WarehousePermissionSet = WAREHOUSE_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as WarehousePermissionSet,
);

export function useWarehousePermissions(): WarehousePermissionSet {
  const { isExecutiveUser, warehousePermissions } = useAppContext();
  return useMemo<WarehousePermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_WAREHOUSE_PERMISSIONS_GRANTED };
    if (warehousePermissions) return warehousePermissions;
    return { ...ALL_WAREHOUSE_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, warehousePermissions]);
}
