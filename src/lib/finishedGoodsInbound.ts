import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshParentProductStatus } from '@/src/lib/productAggregateStatus';
import { applyVariantBranchStockDelta } from '@/src/lib/productVariantStock';

/**
 * Add finished units at a branch (e.g. production recorded), rollup totals, set `last_restocked`.
 */
export async function addFinishedVariantUnitsAtBranch(
  supabase: SupabaseClient,
  params: {
    variantId: string;
    productId: string;
    branchId: string;
    units: number;
    reorderPoint: number;
  },
): Promise<void> {
  const delta = Math.floor(params.units);
  if (delta <= 0) return;

  await applyVariantBranchStockDelta(
    {
      variantId: params.variantId,
      productId: params.productId,
      branchId: params.branchId,
      delta,
      reorderPoint: params.reorderPoint,
      updateLastRestocked: true,
    },
    supabase,
  );
  await refreshParentProductStatus(params.productId);
}
