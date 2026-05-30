/**
 * Raw materials catalog permission catalog + resolver hook.
 * Same model as orders/products: per-employee toggles, executives always full access.
 */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type MaterialPermissionKey =
  | 'pageAccess'
  | 'stockAccess'
  | 'paymentData'
  | 'categoryCreation'
  | 'exportAccess'
  | 'materialCreation'
  | 'purchaseOrdersHistory'
  | 'analyticsAccess';

export interface MaterialPermissionDef {
  key: MaterialPermissionKey;
  label: string;
  description: string;
}

/** Ordered for the employee Access tab — access → inventory → catalog admin → procurement → analytics. */
export const MATERIAL_PERMISSIONS: readonly MaterialPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Raw Materials catalog, category, and material detail pages.',
  },
  {
    key: 'stockAccess',
    label: 'Stock Access',
    description:
      'See stock levels, KPIs, and alerts; adjust stock; set reorder points; overwrite current stock when editing.',
  },
  {
    key: 'paymentData',
    label: 'Payment Data',
    description: 'See inventory values, unit costs, and price-related KPIs.',
  },
  {
    key: 'categoryCreation',
    label: 'Category Creation',
    description: 'Add categories and edit category details.',
  },
  {
    key: 'exportAccess',
    label: 'Export Access',
    description: 'Use any export on the Raw Materials pages (catalog, category, material detail).',
  },
  {
    key: 'materialCreation',
    label: 'Material Creation',
    description: 'Add and edit raw materials — details, specs, costs, and reorder settings.',
  },
  {
    key: 'purchaseOrdersHistory',
    label: 'Purchase Orders History',
    description: 'View purchase order records linked to a raw material.',
  },
  {
    key: 'analyticsAccess',
    label: 'Analytics Access',
    description: 'View consumption charts, price history, and linked-product analytics.',
  },
] as const;

export type MaterialPermissionSet = Record<MaterialPermissionKey, boolean>;

export const ALL_MATERIAL_PERMISSIONS_GRANTED: MaterialPermissionSet = MATERIAL_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as MaterialPermissionSet,
);

export function useMaterialPermissions(): MaterialPermissionSet {
  const { isExecutiveUser, materialPermissions } = useAppContext();
  return useMemo<MaterialPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
    if (materialPermissions) return materialPermissions;
    return { ...ALL_MATERIAL_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, materialPermissions]);
}
