/** Inter-branch request permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type InterBranchRequestPermissionKey =
  | 'pageAccess'
  | 'creation'
  | 'approvals'
  | 'scheduling'
  | 'documents'
  | 'activityLog'
  | 'loading'
  | 'delivery';

export interface InterBranchRequestPermissionDef {
  key: InterBranchRequestPermissionKey;
  label: string;
  description: string;
}

export const INTER_BRANCH_REQUEST_PERMISSIONS: readonly InterBranchRequestPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'View the Inter-branch Requests list and individual request detail pages.',
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
    description: 'Approve or reject inter-branch requests pending review.',
  },
  {
    key: 'scheduling',
    label: 'Request Scheduling',
    description: 'Schedule an IBR and mark shipments as in transit.',
  },
  {
    key: 'documents',
    label: 'Documents and Proofs',
    description: 'Upload and view delivery documents and proofs.',
  },
  {
    key: 'activityLog',
    label: 'Activity Log',
    description: 'View the inter-branch request activity log.',
  },
  {
    key: 'loading',
    label: 'Request Loading',
    description: 'Mark requests as Loading, Packed, and Ready.',
  },
  {
    key: 'delivery',
    label: 'Request Delivery',
    description: 'Record received quantities and mark requests as fulfilled or complete.',
  },
] as const;

export type InterBranchRequestPermissionSet = Record<InterBranchRequestPermissionKey, boolean>;

export const ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED: InterBranchRequestPermissionSet =
  INTER_BRANCH_REQUEST_PERMISSIONS.reduce(
    (acc, def) => {
      acc[def.key] = true;
      return acc;
    },
    {} as InterBranchRequestPermissionSet,
  );

export function useInterBranchRequestPermissions(): InterBranchRequestPermissionSet {
  const { isExecutiveUser, interBranchRequestPermissions } = useAppContext();
  return useMemo<InterBranchRequestPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
    if (interBranchRequestPermissions) return interBranchRequestPermissions;
    return { ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, interBranchRequestPermissions]);
}
