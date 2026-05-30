/** Purchase order (warehouse procurement) permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type PurchaseOrderPermissionKey =
  | 'pageAccess'
  | 'creation'
  | 'approvals'
  | 'documents'
  | 'activityLog'
  | 'receiveOrders'
  | 'recordPayments';

export interface PurchaseOrderPermissionDef {
  key: PurchaseOrderPermissionKey;
  label: string;
  description: string;
}

export const PURCHASE_ORDER_PERMISSIONS: readonly PurchaseOrderPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'View the Purchase Orders list and individual order detail pages.',
  },
  {
    key: 'creation',
    label: 'Order Creation',
    description:
      'Create orders, submit or resubmit for approval, add lines, edit details, and cancel orders.',
  },
  {
    key: 'approvals',
    label: 'Order Approval',
    description: 'Approve, reject, and confirm purchase orders.',
  },
  {
    key: 'documents',
    label: 'Documents and Proofs',
    description: 'Upload and view documents and delivery/payment proofs.',
  },
  {
    key: 'activityLog',
    label: 'Activity Log',
    description: 'View the purchase order activity log.',
  },
  {
    key: 'receiveOrders',
    label: 'Receive Orders',
    description: 'Record received quantities for purchase order lines.',
  },
  {
    key: 'recordPayments',
    label: 'Record Payments',
    description: 'Mark payments and record payment proofs.',
  },
] as const;

export type PurchaseOrderPermissionSet = Record<PurchaseOrderPermissionKey, boolean>;

export const ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED: PurchaseOrderPermissionSet =
  PURCHASE_ORDER_PERMISSIONS.reduce(
    (acc, def) => {
      acc[def.key] = true;
      return acc;
    },
    {} as PurchaseOrderPermissionSet,
  );

export function usePurchaseOrderPermissions(): PurchaseOrderPermissionSet {
  const { isExecutiveUser, purchaseOrderPermissions } = useAppContext();
  return useMemo<PurchaseOrderPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
    if (purchaseOrderPermissions) return purchaseOrderPermissions;
    return { ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, purchaseOrderPermissions]);
}
