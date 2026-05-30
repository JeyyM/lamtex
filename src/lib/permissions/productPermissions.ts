/**
 * Product catalog permission catalog + resolver hook.
 * Same model as orders: per-employee toggles, executives always full access.
 */

import { useMemo } from 'react';
import { useAppContext } from '@/src/store/AppContext';

export type ProductPermissionKey =
  | 'pageAccess'
  | 'stockAccess'
  | 'paymentData'
  | 'categoryCreation'
  | 'exportAccess'
  | 'productCreation'
  | 'priceModification'
  | 'dataAndStatistics'
  | 'activityLog';

export interface ProductPermissionDef {
  key: ProductPermissionKey;
  label: string;
  description: string;
}

/** Ordered for the employee Access tab — access → inventory → catalog admin → analytics. */
export const PRODUCT_PERMISSIONS: readonly ProductPermissionDef[] = [
  {
    key: 'pageAccess',
    label: 'Page Access',
    description: 'Open the Products catalog, category, and product family pages.',
  },
  {
    key: 'stockAccess',
    label: 'Stock Access',
    description:
      'See stock levels, KPIs, and warnings; adjust stock; set reorder points and manual overrides.',
  },
  {
    key: 'paymentData',
    label: 'Payment Data',
    description: 'See revenue KPIs, units sold, revenue totals, and average prices.',
  },
  {
    key: 'categoryCreation',
    label: 'Category Creation',
    description: 'Add categories and edit category details.',
  },
  {
    key: 'exportAccess',
    label: 'Export Access',
    description: 'Use any export on the Products pages (catalog, category, variant comparison).',
  },
  {
    key: 'productCreation',
    label: 'Product Creation',
    description:
      'Add and edit product families and variants — basic info, initial prices, stock, specs, BOM, trucking units, and quotas.',
  },
  {
    key: 'priceModification',
    label: 'Price Modification',
    description: 'Edit selling prices and production costs after initial setup.',
  },
  {
    key: 'dataAndStatistics',
    label: 'Data and Statistics',
    description: 'See the All Variants Comparison table and chart.',
  },
  {
    key: 'activityLog',
    label: 'Activity Log',
    description: 'See the product activity log on family pages.',
  },
] as const;

export type ProductPermissionSet = Record<ProductPermissionKey, boolean>;

export const ALL_PRODUCT_PERMISSIONS_GRANTED: ProductPermissionSet = PRODUCT_PERMISSIONS.reduce(
  (acc, def) => {
    acc[def.key] = true;
    return acc;
  },
  {} as ProductPermissionSet,
);

export function useProductPermissions(): ProductPermissionSet {
  const { isExecutiveUser, productPermissions } = useAppContext();
  return useMemo<ProductPermissionSet>(() => {
    if (isExecutiveUser) return { ...ALL_PRODUCT_PERMISSIONS_GRANTED };
    if (productPermissions) return productPermissions;
    return { ...ALL_PRODUCT_PERMISSIONS_GRANTED };
  }, [isExecutiveUser, productPermissions]);
}
