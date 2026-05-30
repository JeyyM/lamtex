/** Production request permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type ProductionRequestPermissionKey =
  | 'pageAccess'
  | 'creation'
  | 'approvals'
  | 'fulfillment';

export interface ProductionRequestPermissionDef {
  key: ProductionRequestPermissionKey;
  label: string;
  description: string;
}

export const PRODUCTION_REQUEST_PERMISSIONS: readonly ProductionRequestPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'View the Production Requests list and individual request detail pages.',
  },
  {
    key: 'creation',
    label: 'Requests Creation',
    description:
      'Create requests, submit or resubmit for approval, add lines, edit details, and cancel requests.',
  },
  {
    key: 'approvals',
    label: 'Request Approval',
    description: 'Approve or reject production requests pending review.',
  },
  {
    key: 'fulfillment',
    label: 'Request Fulfillment',
    description: 'Start production, mark completion, and record production output.',
  },
] as const;

export type ProductionRequestPermissionSet = Record<ProductionRequestPermissionKey, boolean>;

export const ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED: ProductionRequestPermissionSet =
  PRODUCTION_REQUEST_PERMISSIONS.reduce(
    (acc, def) => {
      acc[def.key] = true;
      return acc;
    },
    {} as ProductionRequestPermissionSet,
  );

export function useProductionRequestPermissions(): ProductionRequestPermissionSet {
  const { isExecutiveUser, productionRequestPermissions } = useAppContext();
  return useMemo<ProductionRequestPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
    if (productionRequestPermissions) return productionRequestPermissions;
    return { ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, productionRequestPermissions]);
}
