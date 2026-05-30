/** Customers module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type CustomerPermissionKey = 'pageAccess';

export interface CustomerPermissionDef {
  key: CustomerPermissionKey;
  label: string;
  description: string;
}

export const CUSTOMER_PERMISSIONS: readonly CustomerPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Customers list, customer detail, and customer create/edit pages.',
  },
] as const;

export type CustomerPermissionSet = Record<CustomerPermissionKey, boolean>;

export const ALL_CUSTOMER_PERMISSIONS_GRANTED: CustomerPermissionSet = CUSTOMER_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as CustomerPermissionSet,
);

export const ALL_CUSTOMER_PERMISSIONS_DENIED: CustomerPermissionSet = CUSTOMER_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = false;
    return acc;
  },
  {} as CustomerPermissionSet,
);

export function useCustomerPermissions(): CustomerPermissionSet {
  const { isExecutiveUser, customerPermissions } = useAppContext();
  return useMemo<CustomerPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_CUSTOMER_PERMISSIONS_GRANTED };
    if (customerPermissions) return customerPermissions;
    return { ...ALL_CUSTOMER_PERMISSIONS_DENIED };
  }, [isExecutiveUser, customerPermissions]);
}
