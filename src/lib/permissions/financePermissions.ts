/** Finance module permission catalog + resolver hook. */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type FinancePermissionKey = 'pageAccess' | 'commissions';

export interface FinancePermissionDef {
  key: FinancePermissionKey;
  label: string;
  description: string;
}

export const FINANCE_PERMISSIONS: readonly FinancePermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Finance page (outstanding orders and customer credit).',
  },
  {
    key: 'commissions',
    label: 'Commissions',
    description: 'View commission KPIs and use Commission Release to pay out agent commissions.',
  },
] as const;

export type FinancePermissionSet = Record<FinancePermissionKey, boolean>;

export const ALL_FINANCE_PERMISSIONS_GRANTED: FinancePermissionSet = FINANCE_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as FinancePermissionSet,
);

export function useFinancePermissions(): FinancePermissionSet {
  const { isExecutiveUser, financePermissions } = useAppContext();
  return useMemo<FinancePermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_FINANCE_PERMISSIONS_GRANTED };
    if (financePermissions) return financePermissions;
    return { ...ALL_FINANCE_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, financePermissions]);
}
