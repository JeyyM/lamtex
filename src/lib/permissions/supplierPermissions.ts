/** Suppliers module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type SupplierPermissionKey = 'pageAccess';

export interface SupplierPermissionDef {
  key: SupplierPermissionKey;
  label: string;
  description: string;
}

export const SUPPLIER_PERMISSIONS: readonly SupplierPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Suppliers list and supplier detail pages.',
  },
] as const;

export type SupplierPermissionSet = Record<SupplierPermissionKey, boolean>;

export const ALL_SUPPLIER_PERMISSIONS_GRANTED: SupplierPermissionSet = SUPPLIER_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as SupplierPermissionSet,
);

export function useSupplierPermissions(): SupplierPermissionSet {
  const { isExecutiveUser, supplierPermissions } = useAppContext();
  return useMemo<SupplierPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_SUPPLIER_PERMISSIONS_GRANTED };
    if (supplierPermissions) return supplierPermissions;
    return { ...ALL_SUPPLIER_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, supplierPermissions]);
}
