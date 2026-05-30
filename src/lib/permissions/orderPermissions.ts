/**
 * Order-level permission catalog + resolver hook.
 *
 * Design goals (per product requirements):
 *  - Roles are NOT strict. An employee may act in several capacities; their
 *    main role only decides the default dashboard, not what they can do.
 *  - Access is governed by a per-employee checkbox system, independent of role.
 *  - Executives always have full access.
 *
 * Permissions are stored per employee in `employee_order_permissions`
 * and loaded into AppContext on login. Missing rows default to full access.
 */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type OrderPermissionKey =
  | 'pageAccess'
  | 'creation'
  | 'customerSetup'
  | 'agentBranchSelection'
  | 'payment'
  | 'approvals'
  | 'scheduling'
  | 'deliveries'
  | 'cancellation'
  | 'orderSummary'
  | 'documents'
  | 'commissionRelease'
  | 'activityLog'
  | 'dataExport';

export interface OrderPermissionDef {
  key: OrderPermissionKey;
  label: string;
  /** Plain-language description for the per-employee settings UI. */
  description: string;
}

/** Ordered for the employee Access tab — general → workflow → reporting. */
export const ORDER_PERMISSIONS: readonly OrderPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'View the Orders list and order detail pages.',
  },
  {
    key: 'creation',
    label: 'Creation',
    description:
      'Create an order, send it for approval/resubmission, and add new items to an order.',
  },
  {
    key: 'customerSetup',
    label: 'Customer Setup',
    description: 'Choose the customer based on the assigned agent.',
  },
  {
    key: 'agentBranchSelection',
    label: 'Agent and Branch Selection',
    description: 'Reassign the order branch and the order agent.',
  },
  {
    key: 'payment',
    label: 'Payment Access',
    description:
      'Show price amounts and payment status in tables. Without it the user sees quantities only — no list prices, discounts, or totals, including when choosing/editing item quantities — and cannot edit payment terms.',
  },
  {
    key: 'approvals',
    label: 'Approvals',
    description:
      'Approve or reject an order. Without it the "Approved" option is removed from the status selector and approve/reject actions are hidden.',
  },
  {
    key: 'scheduling',
    label: 'Scheduling',
    description: 'Mark as Scheduled, create trips, and mark orders as In Transit.',
  },
  {
    key: 'deliveries',
    label: 'Deliveries',
    description:
      'Record delivered quantities, mark partially delivered/completed, edit delivered counts, and edit delivery details such as delivery type and required date.',
  },
  {
    key: 'cancellation',
    label: 'Cancellation',
    description: 'Cancel an order.',
  },
  {
    key: 'orderSummary',
    label: 'Order Summary',
    description:
      'See the order summary section and send the order status email to the customer (viewing the page itself is not restricted).',
  },
  {
    key: 'documents',
    label: 'Documents and Proofs',
    description: 'Upload and view proof documents.',
  },
  {
    key: 'commissionRelease',
    label: 'Commission Release',
    description:
      'View commission amounts on payment proofs and release agent commission payouts.',
  },
  {
    key: 'activityLog',
    label: 'Activity Log',
    description: 'See the order activity log.',
  },
  {
    key: 'dataExport',
    label: 'Data Exporting',
    description: 'Export the orders table to Excel from the Orders list page.',
  },
] as const;

export type OrderPermissionSet = Record<OrderPermissionKey, boolean>;

export const ALL_ORDER_PERMISSIONS_GRANTED: OrderPermissionSet = ORDER_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as OrderPermissionSet,
);

export function useOrderPermissions(): OrderPermissionSet {
  const { isExecutiveUser, orderPermissions } = useAppContext();
  return useMemo<OrderPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_ORDER_PERMISSIONS_GRANTED };
    if (orderPermissions) return orderPermissions;
    return { ...ALL_ORDER_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, orderPermissions]);
}
